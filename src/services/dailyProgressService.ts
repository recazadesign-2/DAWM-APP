// Syncs the current user's local daily progress to user_daily_progress
// so that Group leaderboards have a real-time source of truth.
import { supabase } from "@/integrations/supabase/client";

export type DailySync = {
  quranTarget: number;
  quranPagesRead: number;
  morningDone: boolean;
  eveningDone: boolean;
  points: number;
};

export function computeCompletionPct(d: DailySync): number {
  const totalTasks = 2 + (d.quranTarget > 0 ? 1 : 0); // morning + evening + quran
  if (totalTasks === 0) return 0;
  const quranPct = d.quranTarget > 0
    ? Math.min(1, d.quranPagesRead / d.quranTarget)
    : 0;
  const completed =
    quranPct + (d.morningDone ? 1 : 0) + (d.eveningDone ? 1 : 0);
  return Math.round((completed / totalTasks) * 100);
}

let lastPayload = "";
let inFlight = false;
let pending: DailySync | null = null;

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

export async function syncDailyProgress(data: DailySync) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const completion_pct = computeCompletionPct(data);
  const payload = {
    user_id: user.id,
    date: today(),
    quran_target: data.quranTarget,
    quran_pages_read: data.quranPagesRead,
    morning_done: data.morningDone,
    evening_done: data.eveningDone,
    completion_pct,
    points: data.points ?? 0,
  };
  const sig = JSON.stringify(payload);
  if (sig === lastPayload) return;

  if (inFlight) {
    pending = data;
    return;
  }
  inFlight = true;
  try {
    const { error } = await supabase
      .from("user_daily_progress")
      .upsert(payload, { onConflict: "user_id,date" });
    if (!error) lastPayload = sig;
  } finally {
    inFlight = false;
    if (pending) {
      const next = pending;
      pending = null;
      syncDailyProgress(next);
    }
  }
}
