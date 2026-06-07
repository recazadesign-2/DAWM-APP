// Badges / achievements — definitions + unlock logic + earned-date persistence.
import { progressService } from "@/services/progressService";
import {
  gamificationService,
  evaluateCondition,
  type BadgeCondition,
} from "@/services/gamificationService";

export type BadgeId = string;

export interface BadgeDef {
  id: BadgeId;
  label: string;
  description: string;
  condition: BadgeCondition;
  /** True for built-in defaults; false for admin-created custom badges. */
  isDefault: boolean;
}

export interface BadgeSnapshot {
  points: number;
  streak: number;
  pagesRead: number;
  morningDoneToday: boolean;
  eveningDoneToday: boolean;
}

export interface BadgeState {
  id: BadgeId;
  label: string;
  description: string;
  isDefault: boolean;
  unlocked: boolean;
  earnedAt: string | null;
}

const STORAGE = "dawm:badges:earnedAt";

/** Built-in default badges. Admins can override labels/conditions or remove them. */
export const DEFAULT_BADGES: BadgeDef[] = [
  { id: "fajr_reader",     label: "قارئ الفجر",     description: "أكمل أذكار الصباح", condition: { kind: "morning_done" }, isDefault: true },
  { id: "perfect_khatma",  label: "ختمة متميزة",    description: "اقرأ ٦٠٤ صفحة",     condition: { kind: "pages_gte", value: 604 }, isDefault: true },
  { id: "night_riser",     label: "قائم الليل",     description: "أكمل أذكار المساء", condition: { kind: "evening_done" }, isDefault: true },
  { id: "streak_30",       label: "٣٠ يوم متتالي",  description: "حافظ ٣٠ يوماً",     condition: { kind: "streak_gte", value: 30 }, isDefault: true },
  { id: "thousand_points", label: "ألف نقطة",       description: "اجمع ١٠٠٠ نقطة",    condition: { kind: "points_gte", value: 1000 }, isDefault: true },
  { id: "surah_keeper",    label: "حافظ السورة",    description: "اقرأ ٢٠ صفحة",      condition: { kind: "pages_gte", value: 20 }, isDefault: true },
];

/** Resolve effective badges = (defaults − removed + overrides) ∪ custom. */
export function getBadges(): BadgeDef[] {
  const cfg = gamificationService.getConfig();
  const defaults = DEFAULT_BADGES
    .filter((b) => !cfg.removedDefaults.includes(b.id))
    .map<BadgeDef>((b) => {
      const ov = cfg.badgeOverrides[b.id];
      return ov ? { ...b, ...ov, condition: ov.condition ?? b.condition } : b;
    });
  const custom = cfg.customBadges.map<BadgeDef>((b) => ({ ...b, isDefault: false }));
  return [...defaults, ...custom];
}

/** Legacy export — list of currently-effective badges (replaces the old constant). */
export const BADGES = DEFAULT_BADGES;

function readEarned(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE) || "{}");
  } catch {
    return {};
  }
}

function writeEarned(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE, JSON.stringify(map));
}

export const badgesService = {
  evaluate(snapshot: BadgeSnapshot): BadgeState[] {
    const earned = readEarned();
    let mutated = false;
    const list = getBadges().map<BadgeState>((b) => {
      const unlocked = evaluateCondition(b.condition, snapshot);
      if (unlocked && !earned[b.id]) {
        earned[b.id] = new Date().toISOString();
        mutated = true;
      }
      return {
        id: b.id,
        label: b.label,
        description: b.description,
        isDefault: b.isDefault,
        unlocked,
        earnedAt: earned[b.id] ?? null,
      };
    });
    if (mutated) writeEarned(earned);
    return list;
  },

  /** Force a badge to be considered "earned now" (test tool). */
  forceUnlock(id: BadgeId) {
    const map = readEarned();
    map[id] = new Date().toISOString();
    writeEarned(map);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("badges-changed"));
    }
  },

  /** Clear the earned-at record for one or all badges (test tool). */
  reset(id?: BadgeId) {
    if (id) {
      const map = readEarned();
      delete map[id];
      writeEarned(map);
    } else {
      writeEarned({});
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("badges-changed"));
    }
  },

  buildSnapshot(opts: {
    points: number;
    streak: number;
    morningDoneToday: boolean;
    eveningDoneToday: boolean;
  }): BadgeSnapshot {
    const prog = progressService.get();
    return {
      points: opts.points,
      streak: opts.streak,
      pagesRead: Math.max(0, (prog.lastReadPage ?? 1) - 1),
      morningDoneToday: opts.morningDoneToday,
      eveningDoneToday: opts.eveningDoneToday,
    };
  },
};
