// Aggregates real per-day progress from localStorage into the shapes the
// Stats screen needs (streak, weekly bars, 12-week heatmap, totals).
import type { DailyProgress } from "./progressService";

const PREFIX = "dawm:progress:";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readDay(date: string): DailyProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + date);
    if (!raw) return null;
    return JSON.parse(raw) as DailyProgress;
  } catch {
    return null;
  }
}

export interface DayStat {
  date: string;
  pages: number;
  completed: boolean;
}

function dayStat(date: string): DayStat {
  const d = readDay(date);
  return {
    date,
    pages: d?.quranPagesRead ?? 0,
    completed: !!d?.completed,
  };
}

/** Count consecutive days (today backwards) where the user read >= 1 page. */
export function computeStreak(): number {
  const cursor = new Date();
  let streak = 0;
  // Allow today to be 0 without breaking the streak (count from yesterday).
  const t = dayStat(isoDate(cursor));
  if (t.pages > 0) streak += 1;
  else {
    cursor.setDate(cursor.getDate() - 1);
    // try yesterday onwards
  }
  while (true) {
    cursor.setDate(cursor.getDate() - 1);
    const s = dayStat(isoDate(cursor));
    if (s.pages > 0) streak += 1;
    else break;
    if (streak > 3650) break; // safety
  }
  return streak;
}

/** Total counted pages across all stored days. */
export function computeTotalPages(): number {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    try {
      const d = JSON.parse(localStorage.getItem(k) || "{}") as DailyProgress;
      total += d.quranPagesRead || 0;
    } catch {
      /* ignore */
    }
  }
  return total;
}

/**
 * Last 7 days ordered Saturday..Friday matching the WEEK labels
 * ["س","ح","ن","ث","ر","خ","ج"] used in the Stats screen.
 * Returns the page count per weekday.
 */
export function computeWeekData(): number[] {
  // JS getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // We want index: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const slot = (d: Date) => (d.getDay() + 1) % 7;
  const out = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const s = dayStat(isoDate(d));
    out[slot(d)] = s.pages;
  }
  return out;
}

/**
 * 12 weeks × 7 days = 84 cells, oldest first. Each cell is a level 0..4
 * based on pages read that day. Used by the heatmap.
 */
export function computeHeatmap(): number[] {
  const cells: number[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const s = dayStat(isoDate(d));
    cells.push(pagesToLevel(s.pages));
  }
  return cells;
}

function pagesToLevel(pages: number): number {
  if (pages <= 0) return 0;
  if (pages < 2) return 1;
  if (pages < 4) return 2;
  if (pages < 6) return 3;
  return 4;
}

export const statsService = {
  computeStreak,
  computeTotalPages,
  computeWeekData,
  computeHeatmap,
};
