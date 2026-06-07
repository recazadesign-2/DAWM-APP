// Daily progress service — internal counting rules (do not expose to users).
import { levelService } from "./levelService";
import { ActionType, addPoints as awardPoints, applyWirdCompletionBonus } from "./pointsService";
import { getSetting } from "./settingsService";

export interface TrackedPage {
  pageNumber: number;
  /** Total accumulated seconds across all visits in this app session. */
  timeSpent: number;
  /** Longest single continuous-focus duration in seconds. */
  continuousMax: number;
  counted: boolean;
}

export interface DailyProgress {
  date: string;
  quranPagesRead: number;
  startPage?: number;
  targetGoal?: number;
  lastReadPage?: number;
  lastCompletedPage?: number;
  trackedPages: TrackedPage[];
  azkarMorning?: { timeSpent: number; tasbeehCount: number; completed: boolean };
  azkarEvening?: { timeSpent: number; tasbeehCount: number; completed: boolean };
  kahfCompleted?: boolean;
  pointsAwarded: {
    quranCompletion?: boolean;
    morningAzkar?: boolean;
    eveningAzkar?: boolean;
    extraPages?: number;
    usageTime?: number;
    tasbeehCount?: number;
    pagesCountedPaid?: number;   // # pages already paid base (5 pts) for
    wirdBonusApplied?: boolean;  // retroactive +5/page applied for the wird
  };
  usageSeconds?: number;
  completed: boolean;
}

const KEY = (date: string) => `dawm:progress:${date}`;
const LAST_SUCCESS_KEY = "dawm:last_successful_page";
const today = () => new Date().toISOString().slice(0, 10);

/** Persistent across days: the highest page the user has ever successfully completed. */
function readLastSuccessfulPage(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(LAST_SUCCESS_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function writeLastSuccessfulPage(page: number) {
  if (typeof window === "undefined") return;
  const cur = readLastSuccessfulPage();
  if (page > cur) localStorage.setItem(LAST_SUCCESS_KEY, String(page));
}


// Thresholds are resolved per-call via settingsService so admin updates propagate instantly.
const CONTINUOUS_THRESHOLD = () => getSetting("min_continuous_time");
const INTERMITTENT_THRESHOLD = () => getSetting("max_cumulative_time");
const BUFFER_GAP_MS = () => getSetting("buffer_time_limit") * 1000;
const STILLNESS_LIMIT_MS = 60 * 1000; // freeze counter after 60s no interaction

function readProgress(): DailyProgress {
  if (typeof window === "undefined") return emptyProgress();
  const raw = localStorage.getItem(KEY(today()));
  if (raw) {
    try {
      const data = JSON.parse(raw) as DailyProgress;
      if (!data.pointsAwarded) data.pointsAwarded = {};
      if (!data.trackedPages) data.trackedPages = [];
      data.trackedPages.forEach((p) => {
        if (typeof p.continuousMax !== "number") p.continuousMax = p.timeSpent || 0;
      });
      return data;
    } catch {
      /* ignore */
    }
  }
  return emptyProgress();
}

function emptyProgress(): DailyProgress {
  return {
    date: today(),
    quranPagesRead: 0,
    trackedPages: [],
    pointsAwarded: {},
    completed: false,
  };
}

function writeProgress(data: DailyProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(today()), JSON.stringify(data));
  if (typeof data.lastCompletedPage === "number") {
    writeLastSuccessfulPage(data.lastCompletedPage);
  }
  window.dispatchEvent(new CustomEvent("progress-changed", { detail: data }));
}


function isEligible(entry: TrackedPage) {
  return (
    entry.continuousMax >= CONTINUOUS_THRESHOLD() ||
    entry.timeSpent >= INTERMITTENT_THRESHOLD()
  );
}

class ProgressService {
  /** Start of the current continuous streak on the current page. */
  private streakStart = 0;
  /** Length of the current continuous streak (ms). */
  private streakElapsedMs = 0;
  /** Total ms accumulated on the current page across all streaks. */
  private visitBaseTimeSpent = 0;
  /** Last interaction timestamp (for stillness detection). */
  private lastInteraction = 0;
  /** Did we already use the single allowed 10s buffer in this streak? */
  private bufferUsed = false;
  /** Hidden-at timestamp when the tab/app went to background. */
  private hiddenAt = 0;

  private currentPage = 0;

  /** True when navigation broke the wird sequence (jump ahead / index / search). */
  private countingDisabled = false;

  // --- bootstrap ---------------------------------------------------------

  get(): DailyProgress {
    return readProgress();
  }

  /**
   * Persistent across days: returns the highest page the user has ever
   * successfully completed. Used by startWird to compute the next day's range.
   */
  getLastSuccessfulPage(): number {
    return readLastSuccessfulPage();
  }

  setGoal(startPage: number, target: number) {
    const data = readProgress();
    data.startPage = startPage;
    data.targetGoal = target;
    if (data.lastCompletedPage === undefined) data.lastCompletedPage = startPage - 1;
    writeProgress(data);
  }

  /** Page where counting is currently allowed (the next due page). */
  private duePage(data: DailyProgress): number {
    if (data.lastCompletedPage !== undefined) return data.lastCompletedPage + 1;
    if (data.startPage !== undefined) return data.startPage;
    return this.currentPage;
  }

  /** Returns true if accumulation is currently allowed on `page`. */
  isCountingActive(page: number): boolean {
    if (this.countingDisabled) return false;
    const data = readProgress();
    if (!data.targetGoal) return true; // free-reading mode
    return page === this.duePage(data);
  }

  // --- timer control -----------------------------------------------------

  startPageTimer(page: number) {
    const now = Date.now();
    this.streakStart = now;
    this.streakElapsedMs = 0;
    this.lastInteraction = now;
    this.bufferUsed = false;
    this.hiddenAt = 0;
    this.currentPage = page;
    const data = readProgress();
    const entry = data.trackedPages.find((p) => p.pageNumber === page);
    this.visitBaseTimeSpent = entry?.timeSpent ?? 0;
    // Re-enable counting if user returned to the due page on their own
    if (page === this.duePage(data)) this.countingDisabled = false;
  }

  getCurrentPageTime() {
    return Math.floor(this.streakElapsedMs / 1000);
  }

  isPageCounted(page: number) {
    const data = readProgress();
    return !!data.trackedPages.find((p) => p.pageNumber === page && p.counted);
  }

  /** Mark a user interaction (touch/click/scroll). Used for stillness check. */
  noteInteraction() {
    this.lastInteraction = Date.now();
  }

  // --- visibility / lifecycle -------------------------------------------

  /** Called when document becomes hidden or app goes to background. */
  handleHidden() {
    // Commit elapsed up to this moment, then mark hiddenAt
    this.advanceStreak();
    this.hiddenAt = Date.now();
  }

  /** Called when document becomes visible again. */
  handleVisible() {
    const now = Date.now();
    const gap = this.hiddenAt ? now - this.hiddenAt : 0;
    this.hiddenAt = 0;
    if (gap <= BUFFER_GAP_MS() && !this.bufferUsed && gap > 0) {
      // Use the single allowed buffer — preserve the streak
      this.bufferUsed = true;
      this.streakStart = now; // resume from now; streakElapsedMs preserved
    } else if (gap > 0) {
      // Hard reset of the continuous streak (cumulative timeSpent preserved)
      this.streakElapsedMs = 0;
      this.streakStart = now;
      this.bufferUsed = false;
    }
    this.lastInteraction = now;
  }

  /** Called on full app close — caller should also invoke handleHidden first. */
  handleAppClose() {
    // Hard reset on next start: nothing to persist (streak state is in-memory)
    this.streakElapsedMs = 0;
    this.bufferUsed = false;
  }

  // --- navigation --------------------------------------------------------

  /** Forward step (next button / swipe forward). */
  handlePageTransition(oldPage: number, newPage: number): DailyProgress {
    this.advanceStreak();
    const data = readProgress();

    if (data.completed) {
      data.quranPagesRead = 0;
      data.startPage = oldPage;
      data.lastCompletedPage = oldPage - 1;
      data.trackedPages = [];
      data.completed = false;
    }

    data.lastReadPage = newPage;
    const isForward = newPage === oldPage + 1;

    let entry = data.trackedPages.find((p) => p.pageNumber === oldPage);
    if (!entry) {
      entry = { pageNumber: oldPage, timeSpent: 0, continuousMax: 0, counted: false };
      data.trackedPages.push(entry);
    }

    if (this.isCountingActive(oldPage)) {
      entry.timeSpent = this.visitBaseTimeSpent + Math.floor(this.streakElapsedMs / 1000);
      const streakSec = Math.floor(this.streakElapsedMs / 1000);
      if (streakSec > entry.continuousMax) entry.continuousMax = streakSec;
    }

    const due = this.duePage(data);
    if (isForward && isEligible(entry) && oldPage === due && !entry.counted) {
      entry.counted = true;
      data.lastCompletedPage = oldPage;
    }

    if (!isForward) {
      // Backward navigation invalidates the continuous streak on oldPage
      entry.continuousMax = 0;
      this.countingDisabled = true;
    }

    data.quranPagesRead = data.trackedPages.filter((p) => p.counted).length;
    this.recomputeKahfAndAwards(data);
    writeProgress(data);
    this.startPageTimer(newPage);
    // Determine if newPage is the due page after this transition
    const newDue = this.duePage(data);
    this.countingDisabled = newPage !== newDue && !!data.targetGoal;
    return data;
  }

  /** Non-sequential jump (index / search / bookmark / jump-to-page). */
  handleJump(targetPage: number): DailyProgress {
    this.advanceStreak();
    const data = readProgress();
    data.lastReadPage = targetPage;
    // Invalidate the continuous streak on the page we're leaving
    const leaving = data.trackedPages.find((p) => p.pageNumber === this.currentPage);
    if (leaving) leaving.continuousMax = 0;
    writeProgress(data);
    this.startPageTimer(targetPage);
    const newDue = this.duePage(data);
    this.countingDisabled = targetPage !== newDue && !!data.targetGoal;
    return data;
  }

  // --- ticking -----------------------------------------------------------

  /** Advance the in-memory streak based on wall-clock & stillness rules. */
  private advanceStreak() {
    if (!this.streakStart) return;
    const now = Date.now();
    const sinceInteraction = now - this.lastInteraction;
    if (sinceInteraction <= STILLNESS_LIMIT_MS) {
      this.streakElapsedMs += now - this.streakStart;
    } else {
      // Freeze: only count up to the stillness limit, then pause
      const allowed = Math.max(0, STILLNESS_LIMIT_MS - (this.streakStart - this.lastInteraction));
      this.streakElapsedMs += Math.min(allowed, now - this.streakStart);
    }
    this.streakStart = now;
  }

  /** Periodic tick — also counts the "final page" without forward nav. */
  tickLastPage(): DailyProgress {
    this.advanceStreak();
    const data = readProgress();
    if (!this.currentPage) return data;
    if (!this.isCountingActive(this.currentPage)) return data;

    let entry = data.trackedPages.find((p) => p.pageNumber === this.currentPage);
    if (!entry) {
      entry = { pageNumber: this.currentPage, timeSpent: 0, continuousMax: 0, counted: false };
      data.trackedPages.push(entry);
    }
    entry.timeSpent = this.visitBaseTimeSpent + Math.floor(this.streakElapsedMs / 1000);
    const streakSec = Math.floor(this.streakElapsedMs / 1000);
    if (streakSec > entry.continuousMax) entry.continuousMax = streakSec;

    const due = this.duePage(data);
    // Final-page exception: count by time only on the last page of the goal
    // or the very last page of the mushaf (handled by caller passing it).
    const isFinalGoalPage =
      data.targetGoal !== undefined &&
      this.currentPage === (data.startPage ?? 1) + data.targetGoal - 1;
    const isMushafEnd = this.currentPage === 604;

    if (
      isEligible(entry) &&
      !entry.counted &&
      (this.currentPage === due || isFinalGoalPage || isMushafEnd)
    ) {
      entry.counted = true;
      if (this.currentPage >= (data.lastCompletedPage ?? -1)) {
        data.lastCompletedPage = this.currentPage;
      }
    }
    data.quranPagesRead = data.trackedPages.filter((p) => p.counted).length;
    this.recomputeKahfAndAwards(data);
    writeProgress(data);
    return data;
  }

  private recomputeKahfAndAwards(data: DailyProgress) {
    const kahfPages = Array.from({ length: 12 }, (_, i) => 293 + i);
    data.kahfCompleted =
      data.trackedPages.filter((p) => kahfPages.includes(p.pageNumber) && p.counted).length === 12;

    // Standard per-page reward: +5 per newly-counted page
    const paid = data.pointsAwarded.pagesCountedPaid ?? 0;
    const countedNow = data.quranPagesRead;
    if (countedNow > paid) {
      const delta = countedNow - paid;
      awardPoints(ActionType.QURAN_PAGE, delta, { pages: delta });
      data.pointsAwarded.pagesCountedPaid = countedNow;
    }

    if (data.targetGoal && data.quranPagesRead >= data.targetGoal && !data.completed) {
      data.completed = true;
    }

    // Retroactive Wird completion bonus: +5/page (turns total into 10/page)
    if (data.completed && !data.pointsAwarded.wirdBonusApplied) {
      applyWirdCompletionBonus(data.quranPagesRead);
      data.pointsAwarded.wirdBonusApplied = true;
      data.pointsAwarded.quranCompletion = true;
    }

    // Extra-pages bonus: each page read after the goal earns +5 retro bonus
    // on top of the +5 base (QURAN_PAGE) — total 10 pts/page, matching the
    // completed-wird rate. Applied atomically per newly-counted extra page.
    if (data.completed && data.quranPagesRead > (data.targetGoal || 0)) {
      const extra = data.quranPagesRead - (data.targetGoal || 0);
      const already = data.pointsAwarded.extraPages || 0;
      if (extra > already) {
        const delta = extra - already;
        applyWirdCompletionBonus(delta);
        data.pointsAwarded.extraPages = extra;
      }
    }
  }


  // --- adhkar / usage (unchanged) ---------------------------------------

  updateAzkar(
    type: "morning" | "evening",
    timeSpent: number,
    tasbeehCount: number,
    totalTarget: number,
  ): boolean {
    const data = readProgress();
    const completed = timeSpent >= 420 && tasbeehCount >= totalTarget * 0.4;
    const key = type === "morning" ? "azkarMorning" : "azkarEvening";
    data[key] = { timeSpent, tasbeehCount, completed };

    if (completed) {
      const pk = type === "morning" ? "morningAzkar" : "eveningAzkar";
      if (!data.pointsAwarded[pk]) {
        data.pointsAwarded[pk] = true;
        levelService.addPoints(30);
      }
    }
    const total =
      (data.azkarMorning?.tasbeehCount || 0) + (data.azkarEvening?.tasbeehCount || 0);
    const already = data.pointsAwarded.tasbeehCount || 0;
    const cur = Math.floor(total / 100);
    const rew = Math.floor(already / 100);
    if (cur > rew) {
      levelService.addPoints((cur - rew) * 10);
      data.pointsAwarded.tasbeehCount = cur * 100;
    }
    writeProgress(data);
    return completed;
  }

  addUsageTime(seconds: number) {
    const data = readProgress();
    data.usageSeconds = (data.usageSeconds || 0) + seconds;
    const totalMin = Math.floor(data.usageSeconds / 60);
    const already = data.pointsAwarded.usageTime || 0;
    const cap = Math.min(60, totalMin);
    const cur = Math.floor(cap / 10);
    const rew = Math.floor(already / 10);
    if (cur > rew) {
      levelService.addPoints((cur - rew) * 5);
      data.pointsAwarded.usageTime = cap;
    }
    writeProgress(data);
  }
}

export const progressService = new ProgressService();
