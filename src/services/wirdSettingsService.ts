// Per-user wird settings with cloud sync.
// Remembers the daily goal and a 7-day lock that follows the user across devices.
import { supabase } from "@/integrations/supabase/client";

const LOCAL_GOAL_KEY = "dawm:wird:dailyGoal";
const LOCAL_LOCK_KEY = "dawm:wird-goal-lock";
export const WIRD_LOCK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WirdSettings {
  dailyGoal: number;
  lockedUntil: number; // ms epoch; 0 = unlocked
}

function readLocal(): WirdSettings {
  if (typeof window === "undefined") return { dailyGoal: 4, lockedUntil: 0 };
  const g = parseInt(localStorage.getItem(LOCAL_GOAL_KEY) || "", 10);
  const l = parseInt(localStorage.getItem(LOCAL_LOCK_KEY) || "", 10);
  return {
    dailyGoal: Number.isFinite(g) && g >= 1 ? g : 4,
    lockedUntil: Number.isFinite(l) && l > Date.now() ? l : 0,
  };
}

function writeLocal(s: WirdSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_GOAL_KEY, String(s.dailyGoal));
    if (s.lockedUntil > Date.now()) {
      localStorage.setItem(LOCAL_LOCK_KEY, String(s.lockedUntil));
    } else {
      localStorage.removeItem(LOCAL_LOCK_KEY);
    }
  } catch {
    /* ignore */
  }
}

export const wirdSettingsService = {
  getLocal(): WirdSettings {
    return readLocal();
  },

  async load(): Promise<WirdSettings> {
    const local = readLocal();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return local;
      const { data } = await supabase
        .from("user_wird_settings")
        .select("daily_goal, locked_until")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const remote: WirdSettings = {
          dailyGoal: data.daily_goal ?? local.dailyGoal,
          lockedUntil: data.locked_until ? new Date(data.locked_until).getTime() : 0,
        };
        writeLocal(remote);
        return remote;
      }
    } catch {
      /* ignore — fall back to local */
    }
    return local;
  },

  async save(s: WirdSettings): Promise<void> {
    writeLocal(s);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_wird_settings").upsert({
        user_id: user.id,
        daily_goal: s.dailyGoal,
        locked_until: s.lockedUntil > 0 ? new Date(s.lockedUntil).toISOString() : null,
        updated_at: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    }
  },
};
