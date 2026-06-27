// ────────────────────────────────────────────────────────────────
// Points Calculation Engine
// ────────────────────────────────────────────────────────────────
// Modular, extensible. All point rewards flow through this service.
// Adding a new reward = add an entry to POINT_CONFIG, no callsite refactor.
//
// Architecture:
//   • ActionType (enum)      → type-safe action identifiers
//   • POINT_CONFIG           → declarative map ActionType → points
//   • onActionCompleted()    → validated event handler (single entry point)
//   • applyWirdCompletion()  → conditional bonus (retroactive 5→10/page)
//   • Audit                  → mirrors every event into `points_history`
//
// Decoupled from page-navigation. Optimistic UI is achieved by writing
// through levelService synchronously (fires `points-changed`), then
// persisting the audit row asynchronously.

import { levelService } from "@/services/levelService";
import { supabase } from "@/integrations/supabase/client";

import { getSetting, SETTINGS_DEFAULTS } from "@/services/settingsService";

// ── Action taxonomy ────────────────────────────────────────────
export enum ActionType {
  QURAN_PAGE = "QURAN_PAGE",
  QURAN_WIRD_BONUS = "QURAN_WIRD_BONUS",
  MORNING_ADHKAR_COMPLETE = "MORNING_ADHKAR_COMPLETE",
  EVENING_ADHKAR_COMPLETE = "EVENING_ADHKAR_COMPLETE",
  TASBEEH_33 = "TASBEEH_33",
  READING_BONUS = "READING_BONUS",
  STREAK_BONUS = "STREAK_BONUS",
  CHARITY_ACT = "CHARITY_ACT",
}

// Resolved at award time — admin settings changes propagate instantly.
function resolvePoints(action: ActionType): number {
  switch (action) {
    case ActionType.QURAN_PAGE:              return getSetting("points_quran_page");
    case ActionType.QURAN_WIRD_BONUS:        return getSetting("points_quran_wird_bonus");
    case ActionType.MORNING_ADHKAR_COMPLETE: return getSetting("points_morning_adhkar");
    case ActionType.EVENING_ADHKAR_COMPLETE: return getSetting("points_evening_adhkar");
    case ActionType.TASBEEH_33:              return getSetting("points_tasbeeh_33");
    default:                                  return 0;
  }
}

// Back-compat: snapshot view of current config (read-only).
export const POINT_CONFIG: Record<ActionType, number> = new Proxy(
  {} as Record<ActionType, number>,
  {
    get: (_t, prop: string) => resolvePoints(prop as ActionType),
  },
);

export const POINT_CONFIG_DEFAULTS = {
  [ActionType.QURAN_PAGE]: SETTINGS_DEFAULTS.points_quran_page,
  [ActionType.QURAN_WIRD_BONUS]: SETTINGS_DEFAULTS.points_quran_wird_bonus,
  [ActionType.MORNING_ADHKAR_COMPLETE]: SETTINGS_DEFAULTS.points_morning_adhkar,
  [ActionType.EVENING_ADHKAR_COMPLETE]: SETTINGS_DEFAULTS.points_evening_adhkar,
  [ActionType.TASBEEH_33]: SETTINGS_DEFAULTS.points_tasbeeh_33,
} as const;

export type ActionMeta = Record<string, unknown> | undefined;

export interface ActionResult {
  action: ActionType;
  awarded: number;     // points actually applied (>=0)
  total: number;       // new total user points
}

// ── Audit log ──────────────────────────────────────────────────
async function logPointsEvent(
  action: ActionType,
  points: number,
  multiplier: number,
  metadata: ActionMeta,
) {
  if (points <= 0) return;
  try {
    await (supabase.rpc as any)("record_points_event", {
      _action_type: action,
      _points: points,
      _multiplier: multiplier,
      _metadata: metadata ?? null,
    });
  } catch {
    /* non-blocking audit — never break UX on log failure */
  }
}

// ── Validation hooks (per action) ──────────────────────────────
// Verify event legitimacy before awarding (e.g. adhkar must be "completed").
type Validator = (meta: ActionMeta) => boolean;

const validators: Partial<Record<ActionType, Validator>> = {
  [ActionType.MORNING_ADHKAR_COMPLETE]: (m) => m?.completed === true,
  [ActionType.EVENING_ADHKAR_COMPLETE]: (m) => m?.completed === true,
};

// ── Core engine ────────────────────────────────────────────────

/**
 * Generic point applicator. Standard path for all actions.
 *
 * @param action      enum from ActionType
 * @param multiplier  how many units of the action occurred (default 1)
 * @param metadata    optional context, used by validators + audit
 */
export function addPoints(
  action: ActionType,
  multiplier = 1,
  metadata?: ActionMeta,
): ActionResult {
  const base = resolvePoints(action);
  const mult = Math.max(0, Math.floor(multiplier));
  const awarded = Math.max(0, base * mult);

  if (awarded === 0) {
    return { action, awarded: 0, total: levelService.getPoints() };
  }

  // Optimistic UI: synchronous total update + 'points-changed' event
  const total = levelService.addPoints(awarded);

  // Async audit
  void logPointsEvent(action, awarded, mult, metadata);

  return { action, awarded, total };
}

/**
 * Event-handler entry point. Validates legitimacy first.
 * Returns null when the event is rejected (no points awarded).
 */
export function onActionCompleted(
  action: ActionType,
  multiplier = 1,
  metadata?: ActionMeta,
): ActionResult | null {
  const validate = validators[action];
  if (validate && !validate(metadata)) return null;
  return addPoints(action, multiplier, metadata);
}

/**
 * Conditional bonus: when the daily Wird target is reached, retroactively
 * upgrade every counted page from 5 → 10 points. We award the *delta only*
 * (one extra QURAN_WIRD_BONUS per page) so totals never double-count.
 *
 * @param pagesInWird total pages counted in the completed wird session
 */
export function applyWirdCompletionBonus(pagesInWird: number): ActionResult {
  const pages = Math.max(0, Math.floor(pagesInWird));
  return addPoints(ActionType.QURAN_WIRD_BONUS, pages, {
    reason: "daily_wird_complete",
    pages,
  });
}

// Expose config for admin/inspection tooling
export const pointsEngine = {
  ActionType,
  POINT_CONFIG,
  addPoints,
  onActionCompleted,
  applyWirdCompletionBonus,
};
