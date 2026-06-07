// Dynamic gamification config — level name/threshold overrides + dynamic badges.
// Persisted in localStorage so the admin panel can tune them without code edits.

import type { BadgeId } from "@/services/badgesService";

export type BadgeConditionKind =
  | "points_gte"
  | "streak_gte"
  | "pages_gte"
  | "morning_done"
  | "evening_done";

export interface BadgeCondition {
  kind: BadgeConditionKind;
  /** Numeric threshold for `*_gte` kinds; ignored otherwise. */
  value?: number;
}

export interface CustomBadge {
  id: string;
  label: string;
  description: string;
  condition: BadgeCondition;
}

export interface BadgeOverride {
  label?: string;
  description?: string;
  condition?: BadgeCondition;
}

export interface LevelOverride {
  name?: string;
  threshold?: number;
  color?: string;
}

interface GamificationConfig {
  levelOverrides: Record<number, LevelOverride>;
  customBadges: CustomBadge[];
  badgeOverrides: Record<string, BadgeOverride>;
  removedDefaults: BadgeId[];
}

const STORAGE_KEY = "dawm:gamification:config";

function defaultConfig(): GamificationConfig {
  return { levelOverrides: {}, customBadges: [], badgeOverrides: {}, removedDefaults: [] };
}

function read(): GamificationConfig {
  if (typeof window === "undefined") return defaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultConfig();
  }
}

function write(cfg: GamificationConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent("gamification-changed"));
}

export const gamificationService = {
  getConfig(): GamificationConfig {
    return read();
  },

  // ---- Levels ----
  setLevelOverride(level: number, patch: LevelOverride) {
    const cfg = read();
    cfg.levelOverrides[level] = { ...cfg.levelOverrides[level], ...patch };
    write(cfg);
  },
  clearLevelOverride(level: number) {
    const cfg = read();
    delete cfg.levelOverrides[level];
    write(cfg);
  },

  // ---- Badges ----
  addCustomBadge(badge: CustomBadge) {
    const cfg = read();
    if (cfg.customBadges.some((b) => b.id === badge.id)) {
      throw new Error("معرّف الوسام مستخدم بالفعل");
    }
    cfg.customBadges.push(badge);
    write(cfg);
  },
  updateCustomBadge(id: string, patch: Partial<Omit<CustomBadge, "id">>) {
    const cfg = read();
    cfg.customBadges = cfg.customBadges.map((b) =>
      b.id === id ? { ...b, ...patch } : b,
    );
    write(cfg);
  },
  deleteCustomBadge(id: string) {
    const cfg = read();
    cfg.customBadges = cfg.customBadges.filter((b) => b.id !== id);
    write(cfg);
  },
  setBadgeOverride(id: BadgeId, patch: BadgeOverride) {
    const cfg = read();
    cfg.badgeOverrides[id] = { ...cfg.badgeOverrides[id], ...patch };
    write(cfg);
  },
  clearBadgeOverride(id: BadgeId) {
    const cfg = read();
    delete cfg.badgeOverrides[id];
    write(cfg);
  },
  removeDefaultBadge(id: BadgeId) {
    const cfg = read();
    if (!cfg.removedDefaults.includes(id)) cfg.removedDefaults.push(id);
    write(cfg);
  },
  restoreDefaultBadge(id: BadgeId) {
    const cfg = read();
    cfg.removedDefaults = cfg.removedDefaults.filter((x) => x !== id);
    write(cfg);
  },

  resetAll() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("gamification-changed"));
  },
};

export function evaluateCondition(
  cond: BadgeCondition,
  s: { points: number; streak: number; pagesRead: number; morningDoneToday: boolean; eveningDoneToday: boolean },
): boolean {
  switch (cond.kind) {
    case "points_gte": return s.points >= (cond.value ?? 0);
    case "streak_gte": return s.streak >= (cond.value ?? 0);
    case "pages_gte":  return s.pagesRead >= (cond.value ?? 0);
    case "morning_done": return s.morningDoneToday;
    case "evening_done": return s.eveningDoneToday;
  }
}

export const CONDITION_LABELS: Record<BadgeConditionKind, string> = {
  points_gte: "النقاط ≥",
  streak_gte: "أيام متتالية ≥",
  pages_gte: "الصفحات المقروءة ≥",
  morning_done: "إكمال أذكار الصباح اليوم",
  evening_done: "إكمال أذكار المساء اليوم",
};
