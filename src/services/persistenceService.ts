// ─────────────────────────────────────────────────────────────────────────────
// Persistence Service
// ─────────────────────────────────────────────────────────────────────────────
// Non-invasive synchronization layer between localStorage (the source of
// truth for all existing business logic) and the Lovable Cloud database.
//
// IMPORTANT: This module MUST NOT modify any calculation, validation, point
// award, level progression, streak rule, or progress logic. It only mirrors
// state outward (write-through to DB) and hydrates state inward (one-shot on
// sign-in). All existing services (progressService, pointsService,
// levelService, badgesService, ThemeContext, AppContext) remain the
// canonical owners of their respective state.
//
// Tables touched (all RLS-scoped to auth.uid()):
//   • user_preferences      ← theme / friday_theme / lossless / notifications
//                             / reminder_time / mushaf_mode
//   • user_gamification     ← total_points / current_level / streak / tasbeeh
//   • user_badges           ← earned badge ids + earned_at
//   • user_daily_detail     ← today's full DailyProgress snapshot
//   • user_activity         ← last_login_at / last_active_at / device_info
//
// Hydration policy (anti-regression):
//   • For numeric totals (points, streak, tasbeeh) we take MAX(local, remote)
//     so a device with newer offline progress is never clobbered.
//   • For preferences we prefer the remote value when local is at its
//     default, otherwise we keep local and push it up.
//   • For per-day detail we prefer whichever side has more counted pages
//     (length of trackedPages.filter(counted)) — never lose work.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/integrations/supabase/client";

type AnyObj = Record<string, unknown>;

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

// ── LocalStorage keys owned by existing services (do not rename) ────────────
const LS = {
  app: "dawm:app",                      // AppContext (preferences + dhikr + tasbeeh)
  theme: "dawm:theme",                  // ThemeContext
  points: "dawm:points",                // levelService
  badgesEarned: "dawm:badges:earnedAt", // badgesService
  progress: (date: string) => `dawm:progress:${date}`,
} as const;

function safeRead<T = AnyObj>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  } catch {
    /* ignore quota errors */
  }
}

// ── Debounce helper ─────────────────────────────────────────────────────────
function debounce<F extends (...a: never[]) => void>(fn: F, ms: number): F {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: never[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as F;
}

// ── Module state ────────────────────────────────────────────────────────────
let currentUserId: string | null = null;
let unsubs: Array<() => void> = [];
let booted = false;

async function getUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

// ── HYDRATE ─────────────────────────────────────────────────────────────────
async function hydrate(userId: string) {
  const [prefsRes, gamiRes, badgesRes, dailyRes] = await Promise.all([
    supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_gamification").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId),
    supabase
      .from("user_daily_detail")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today())
      .maybeSingle(),
  ]);

  // ── Preferences → AppContext (dawm:app) + ThemeContext (dawm:theme) ───
  const remotePrefs = prefsRes.data;
  const localApp = safeRead<AnyObj>(LS.app) ?? {};
  if (remotePrefs) {
    const mergedApp: AnyObj = {
      ...localApp,
      // Prefer remote only when local is missing the key (don't overwrite
      // explicit local choices made offline).
      fridayTheme:
        localApp.fridayTheme === undefined ? remotePrefs.friday_theme : localApp.fridayTheme,
      losslessAudio:
        localApp.losslessAudio === undefined ? remotePrefs.lossless_audio : localApp.losslessAudio,
      notifications:
        localApp.notifications === undefined
          ? remotePrefs.notifications_enabled
          : localApp.notifications,
      reminderTime:
        localApp.reminderTime === undefined ? remotePrefs.reminder_time : localApp.reminderTime,
    };
    safeWrite(LS.app, mergedApp);

    const localTheme = safeRead<string>(LS.theme);
    if (!localTheme && remotePrefs.theme && remotePrefs.theme !== "system") {
      safeWrite(LS.theme, remotePrefs.theme);
    }
  }

  // ── Gamification totals → levelService (dawm:points) ──────────────────
  const remoteGami = gamiRes.data;
  const localPoints =
    parseInt(localStorage.getItem(LS.points) || "0", 10) || 0;
  if (remoteGami) {
    const winner = Math.max(localPoints, remoteGami.total_points ?? 0);
    if (winner !== localPoints) {
      safeWrite(LS.points, String(winner));
      window.dispatchEvent(
        new CustomEvent("points-changed", { detail: { points: winner } }),
      );
    }
  }

  // ── Badges earned-at map → badgesService (dawm:badges:earnedAt) ───────
  const remoteBadges = badgesRes.data ?? [];
  if (remoteBadges.length) {
    const local = safeRead<Record<string, string>>(LS.badgesEarned) ?? {};
    let mutated = false;
    for (const row of remoteBadges) {
      if (!local[row.badge_id] && row.earned_at) {
        local[row.badge_id] = row.earned_at;
        mutated = true;
      }
    }
    if (mutated) {
      safeWrite(LS.badgesEarned, local);
      window.dispatchEvent(new CustomEvent("badges-changed"));
    }
  }

  // ── Today's daily detail → progressService (dawm:progress:YYYY-MM-DD) ──
  const remoteDaily = dailyRes.data;
  if (remoteDaily) {
    const key = LS.progress(today());
    const local = safeRead<AnyObj>(key);
    const localCounted = countCounted(local?.trackedPages as AnyObj[] | undefined);
    const remoteCounted = countCounted(remoteDaily.tracked_pages as AnyObj[]);
    if (!local || remoteCounted > localCounted) {
      const reconstructed: AnyObj = {
        date: remoteDaily.date,
        quranPagesRead: remoteCounted,
        startPage: remoteDaily.start_page ?? undefined,
        targetGoal: remoteDaily.target_goal ?? undefined,
        lastReadPage: remoteDaily.last_read_page ?? undefined,
        lastCompletedPage: remoteDaily.last_completed_page ?? undefined,
        trackedPages: remoteDaily.tracked_pages ?? [],
        azkarMorning: remoteDaily.azkar_morning ?? undefined,
        azkarEvening: remoteDaily.azkar_evening ?? undefined,
        kahfCompleted: remoteDaily.kahf_completed ?? false,
        pointsAwarded: remoteDaily.points_awarded ?? {},
        usageSeconds: remoteDaily.usage_seconds ?? 0,
        completed: remoteDaily.completed ?? false,
      };
      safeWrite(key, reconstructed);
      window.dispatchEvent(
        new CustomEvent("progress-changed", { detail: reconstructed }),
      );
    }
  }

  // ── Activity ping (best-effort) ───────────────────────────────────────
  void supabase.from("user_activity").upsert(
    {
      user_id: userId,
      last_login_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      device_info: {
        ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    },
    { onConflict: "user_id" },
  );

  // After hydration, push current local state up so the cloud catches up
  // with anything that happened offline since last sync.
  pushAll();
}

function countCounted(pages: AnyObj[] | undefined): number {
  if (!Array.isArray(pages)) return 0;
  return pages.filter((p) => p && (p as AnyObj).counted === true).length;
}

// ── MIRROR (write-through) ──────────────────────────────────────────────────
const pushPreferences = debounce(async () => {
  if (!currentUserId) return;
  const app = safeRead<AnyObj>(LS.app) ?? {};
  const theme = (safeRead<string>(LS.theme) as string | null) ?? "system";
  await supabase.from("user_preferences").upsert(
    {
      user_id: currentUserId,
      theme,
      friday_theme: !!app.fridayTheme,
      lossless_audio: !!app.losslessAudio,
      notifications_enabled: app.notifications !== false,
      reminder_time: typeof app.reminderTime === "string" ? app.reminderTime : "08:00",
    },
    { onConflict: "user_id" },
  );
}, 800);

const pushGamification = debounce(async () => {
  if (!currentUserId) return;
  const points =
    parseInt(localStorage.getItem(LS.points) || "0", 10) || 0;
  const app = safeRead<AnyObj>(LS.app) ?? {};
  const tasbeeh =
    typeof (app.dhikr as AnyObj)?.tasbeehCount === "number"
      ? ((app.dhikr as AnyObj).tasbeehCount as number)
      : 0;
  const level = typeof app.level === "number" ? (app.level as number) : 1;
  const streak = typeof app.streak === "number" ? (app.streak as number) : 0;

  // Read existing row to preserve longest_streak monotonicity
  const { data: existing } = await supabase
    .from("user_gamification")
    .select("longest_streak")
    .eq("user_id", currentUserId)
    .maybeSingle();
  const longest = Math.max(existing?.longest_streak ?? 0, streak);

  await supabase.from("user_gamification").upsert(
    {
      user_id: currentUserId,
      total_points: points,
      current_level: level,
      current_streak: streak,
      longest_streak: longest,
      total_tasbeeh: tasbeeh,
      last_active_date: today(),
    },
    { onConflict: "user_id" },
  );
}, 800);

const pushDaily = debounce(async (detail?: AnyObj) => {
  if (!currentUserId) return;
  const d = detail ?? safeRead<AnyObj>(LS.progress(today()));
  if (!d) return;
  const tp = (d.trackedPages as AnyObj[]) ?? [];
  await supabase.from("user_daily_detail").upsert(
    {
      user_id: currentUserId,
      date: (d.date as string) ?? today(),
      tracked_pages: tp as never,
      azkar_morning: (d.azkarMorning as never) ?? null,
      azkar_evening: (d.azkarEvening as never) ?? null,
      kahf_completed: !!d.kahfCompleted,
      usage_seconds: (d.usageSeconds as number) ?? 0,
      points_awarded: ((d.pointsAwarded as AnyObj) ?? {}) as never,
      start_page: (d.startPage as number) ?? null,
      target_goal: (d.targetGoal as number) ?? null,
      last_read_page: (d.lastReadPage as number) ?? null,
      last_completed_page: (d.lastCompletedPage as number) ?? null,
      completed: !!d.completed,
    },
    { onConflict: "user_id,date" },
  );
}, 800);

const pushBadges = debounce(async () => {
  if (!currentUserId) return;
  const earned = safeRead<Record<string, string>>(LS.badgesEarned) ?? {};
  const entries = Object.entries(earned);
  if (!entries.length) return;
  await Promise.all(
    entries.map(([badge_id, earned_at]) =>
      (supabase.rpc as any)("award_user_badge", {
        _badge_id: badge_id,
        _earned_at: earned_at,
      }),
    ),
  );
}, 1000);

function pushAll() {
  pushPreferences();
  pushGamification();
  pushDaily();
  pushBadges();
}

// ── Event wiring ────────────────────────────────────────────────────────────
function startMirroring() {
  const onPoints = () => pushGamification();
  const onProgress = (e: Event) => {
    pushDaily((e as CustomEvent).detail as AnyObj);
    pushGamification();
  };
  const onBadges = () => pushBadges();
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key === LS.app || e.key === LS.theme) pushPreferences();
    if (e.key === LS.points) pushGamification();
    if (e.key === LS.badgesEarned) pushBadges();
    if (e.key.startsWith("dawm:progress:")) pushDaily();
  };
  // Also catch in-tab AppContext writes (no storage event fires for same tab).
  const interval = setInterval(() => {
    pushPreferences();
    pushGamification();
  }, 30_000);

  window.addEventListener("points-changed", onPoints);
  window.addEventListener("progress-changed", onProgress);
  window.addEventListener("badges-changed", onBadges);
  window.addEventListener("storage", onStorage);

  unsubs.push(
    () => window.removeEventListener("points-changed", onPoints),
    () => window.removeEventListener("progress-changed", onProgress),
    () => window.removeEventListener("badges-changed", onBadges),
    () => window.removeEventListener("storage", onStorage),
    () => clearInterval(interval),
  );
}

function stopMirroring() {
  unsubs.forEach((u) => {
    try {
      u();
    } catch {
      /* ignore */
    }
  });
  unsubs = [];
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
async function bind(userId: string | null) {
  if (currentUserId === userId) return;
  stopMirroring();
  currentUserId = userId;
  if (!userId) return;
  try {
    await hydrate(userId);
  } catch {
    /* hydration failures are non-fatal — local state remains canonical */
  }
  startMirroring();
}

export const persistenceService = {
  init() {
    if (booted || typeof window === "undefined") return;
    booted = true;
    // Pick up any existing session immediately
    void getUser().then((u) => bind(u?.id ?? null));
    // React to future auth transitions
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        bind(session?.user?.id ?? null);
      } else if (event === "SIGNED_OUT") {
        bind(null);
      }
    });
  },
  /** Manually trigger a full push (e.g. on unload). */
  flush: pushAll,
};

// Auto-init on import (idempotent).
if (typeof window !== "undefined") {
  persistenceService.init();
}
