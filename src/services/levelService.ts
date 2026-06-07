// Level & points (XP) service for the gamification system.
//
// Point rewards:
//   - Reading 1 Quran page          : +10 XP
//   - Completing daily Wird          : +50 XP (bonus)
//   - Completing morning dhikr       : +30 XP
//   - Completing evening dhikr       : +30 XP
//   - Daily login / streak day       : +10 XP, +5 XP per consecutive day,
//                                      capped at +50 XP

import { gamificationService } from "@/services/gamificationService";

export interface LevelDefinition {
  level: number;
  name: string;
  color: string;
  threshold: number;
}

/** Base (default) levels — admins can override name/threshold/color. */
export const LEVELS: LevelDefinition[] = [
  { level: 1, name: "بداية الطريق", color: "#2E7D32", threshold: 0 },
  { level: 2, name: "المُتعاهد",    color: "#CD7F32", threshold: 500 },
  { level: 3, name: "السالك",       color: "#C0C0C0", threshold: 1500 },
  { level: 4, name: "المُصاحب",     color: "#FFD700", threshold: 3000 },
  { level: 5, name: "الماهر",       color: "#50C878", threshold: 6000 },
  { level: 6, name: "أهل القرآن",   color: "#9C27B0", threshold: 12000 },
];

export const POINT_REWARDS = {
  QURAN_PAGE: 10,
  DAILY_WIRD_BONUS: 50,
  MORNING_DHIKR: 30,
  EVENING_DHIKR: 30,
  STREAK_BASE: 10,
  STREAK_INCREMENT: 5,
  STREAK_MAX: 50,
} as const;

export interface LevelInfo {
  current: LevelDefinition;
  next: LevelDefinition | null;
  percentage: number;
  pointsToNext: number;
  pointsIntoLevel: number;
  rangeForLevel: number;
}

const POINTS_KEY = "dawm:points";

/** Merge base LEVELS with admin overrides from gamificationService. */
function getLevels(): LevelDefinition[] {
  const overrides = (typeof window !== "undefined")
    ? gamificationService.getConfig().levelOverrides
    : {};
  return LEVELS.map((l) => {
    const ov = overrides[l.level];
    return ov ? { ...l, ...ov } : l;
  }).sort((a, b) => a.threshold - b.threshold)
    .map((l, i) => ({ ...l, level: i + 1 }));
}

function findLevel(points: number, list = getLevels()): LevelDefinition {
  for (let i = list.length - 1; i >= 0; i--) {
    if (points >= list[i].threshold) return list[i];
  }
  return list[0];
}

function findNext(level: LevelDefinition, list = getLevels()): LevelDefinition | null {
  const i = list.findIndex((l) => l.level === level.level) + 1;
  return i < list.length ? list[i] : null;
}

export const levelService = {
  /** Live list of levels (base + admin overrides). */
  getLevels,

  /** Rich level info — current, next, percentage between thresholds. */
  getCurrentLevel(points: number): LevelInfo {
    const list = getLevels();
    const current = findLevel(points, list);
    const next = findNext(current, list);
    if (!next) {
      return {
        current,
        next: null,
        percentage: 100,
        pointsToNext: 0,
        pointsIntoLevel: points - current.threshold,
        rangeForLevel: 0,
      };
    }
    const range = next.threshold - current.threshold;
    const into = points - current.threshold;
    const percentage = Math.min(100, Math.max(0, (into / range) * 100));
    return {
      current,
      next,
      percentage,
      pointsToNext: Math.max(0, next.threshold - points),
      pointsIntoLevel: into,
      rangeForLevel: range,
    };
  },

  getNextLevel(points: number): LevelDefinition | null {
    const list = getLevels();
    return findNext(findLevel(points, list), list);
  },

  getProgressPercentage(points: number): number {
    return this.getCurrentLevel(points).percentage;
  },

  getPoints(): number {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(POINTS_KEY) || "0", 10) || 0;
  },

  setPoints(points: number): number {
    if (typeof window === "undefined") return points;
    localStorage.setItem(POINTS_KEY, String(points));
    return points;
  },

  addPoints(pointsToAdd: number): number {
    const old = this.getPoints();
    const newPoints = Math.max(0, old + pointsToAdd);
    const list = getLevels();
    const oldLevel = findLevel(old, list).level;
    const newLevel = findLevel(newPoints, list).level;
    this.setPoints(newPoints);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("points-changed", { detail: { points: newPoints } }),
      );
      if (newLevel > oldLevel) {
        window.dispatchEvent(
          new CustomEvent("level-up", { detail: { level: newLevel, oldLevel } }),
        );
      }
    }
    return newPoints;
  },

  /** Streak bonus: 10 XP base, +5 per extra consecutive day, capped at 50. */
  calculateStreakBonus(streakDays: number): number {
    if (streakDays <= 0) return 0;
    const v = POINT_REWARDS.STREAK_BASE + (streakDays - 1) * POINT_REWARDS.STREAK_INCREMENT;
    return Math.min(POINT_REWARDS.STREAK_MAX, v);
  },
};
