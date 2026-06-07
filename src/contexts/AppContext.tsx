import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { levelService } from "@/services/levelService";
import { progressService } from "@/services/progressService";
import {
  ensureServiceWorker,
  scheduleDailyReminder,
  startGapWatcher,
} from "@/services/notificationService";
import { syncDailyProgress } from "@/services/dailyProgressService";
import { ActionType, onActionCompleted } from "@/services/pointsService";
import "@/services/persistenceService";

interface WirdState {
  pagesRead: number;
  startedAt: string | null;
  completed: boolean;
}

interface DhikrState {
  morningDone: boolean;
  eveningDone: boolean;
  tasbeehCount: number;
}

interface AppState {
  wird: WirdState;
  dailyWirdPages: number;
  lastReadPage: number;
  dhikr: DhikrState;
  points: number;
  level: number;
  streak: number;
  notifications: boolean;
  fridayTheme: boolean;
  losslessAudio: boolean;
  reminderTime: string;
}

interface AppContextType {
  state: AppState;
  startWird: () => void;
  setDailyGoal: (n: number) => void;
  syncWirdFromProgress: () => void;
  completeMorningDhikr: () => void;
  completeEveningDhikr: () => void;
  incrementTasbeeh: () => void;
  resetTasbeeh: () => void;
  addPoints: (n: number) => void;
  toggleSetting: (key: "notifications" | "fridayTheme" | "losslessAudio") => void;
  setReminderTime: (t: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE = "dawm:app";

const initial: AppState = {
  wird: { pagesRead: 0, startedAt: null, completed: false },
  dailyWirdPages: 4,
  lastReadPage: 1,
  dhikr: { morningDone: false, eveningDone: false, tasbeehCount: 0 },
  points: 0,
  level: 1,
  streak: 0,
  notifications: true,
  fridayTheme: false,
  losslessAudio: false,
  reminderTime: "08:00",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      const merged = raw ? { ...initial, ...JSON.parse(raw) } : initial;
      const points = levelService.getPoints();
      merged.points = points;
      merged.level = levelService.getCurrentLevel(points).current.level;
      const prog = progressService.get();
      merged.wird = {
        pagesRead: prog.quranPagesRead,
        startedAt: merged.wird?.startedAt ?? null,
        completed: prog.completed,
      };
      if (prog.lastReadPage) merged.lastReadPage = prog.lastReadPage;
      setState(merged);
    } catch {
      /* ignore */
    }

    const onPoints = (e: Event) => {
      const detail = (e as CustomEvent).detail as { points: number };
      setState((p) => ({
        ...p,
        points: detail.points,
        level: levelService.getCurrentLevel(detail.points).current.level,
      }));
    };
    const onProgress = (e: Event) => {
      const d = (e as CustomEvent).detail as { quranPagesRead: number; completed: boolean; lastReadPage?: number };
      setState((p) => ({
        ...p,
        wird: { ...p.wird, pagesRead: d.quranPagesRead, completed: d.completed },
        lastReadPage: d.lastReadPage ?? p.lastReadPage,
      }));
    };
    window.addEventListener("points-changed", onPoints);
    window.addEventListener("progress-changed", onProgress);
    // bootstrap notifications + service worker
    ensureServiceWorker();
    return () => {
      window.removeEventListener("points-changed", onPoints);
      window.removeEventListener("progress-changed", onProgress);
    };
  }, []);

  // (Re)schedule notifications whenever the relevant settings change
  useEffect(() => {
    if (typeof window === "undefined") return;
    scheduleDailyReminder(state.reminderTime, state.notifications);
    startGapWatcher(state.notifications);
  }, [state.reminderTime, state.notifications, state.wird.completed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    // Sync to backend for group leaderboards
    syncDailyProgress({
      quranTarget: state.dailyWirdPages,
      quranPagesRead: state.wird.pagesRead,
      morningDone: state.dhikr.morningDone,
      eveningDone: state.dhikr.eveningDone,
      points: state.points,
    }).catch(() => {});
  }, [state]);

  const value = useMemo<AppContextType>(
    () => ({
      state,
      startWird: () => {
        const prog = progressService.get();
        // New day → start from (lastSuccessfullyReadPage + 1). Resuming the
        // same day → keep the existing startPage so the range doesn't shift.
        const lastSuccessful = progressService.getLastSuccessfulPage();
        const resumeStart =
          prog.startPage ?? (lastSuccessful > 0 ? lastSuccessful + 1 : (state.lastReadPage || 1));
        progressService.setGoal(resumeStart, state.dailyWirdPages);
        setState((p) => ({
          ...p,
          wird: { ...p.wird, startedAt: new Date().toISOString() },
        }));
      },
      setDailyGoal: (n) => {
        setState((p) => ({ ...p, dailyWirdPages: Math.max(1, n) }));
      },
      syncWirdFromProgress: () => {
        const d = progressService.get();
        setState((p) => ({
          ...p,
          wird: { ...p.wird, pagesRead: d.quranPagesRead, completed: d.completed },
          lastReadPage: d.lastReadPage ?? p.lastReadPage,
        }));
      },
      completeMorningDhikr: () => {
        setState((p) => {
          if (p.dhikr.morningDone) return p;
          onActionCompleted(ActionType.MORNING_ADHKAR_COMPLETE, 1, { completed: true });
          return { ...p, dhikr: { ...p.dhikr, morningDone: true } };
        });
      },
      completeEveningDhikr: () => {
        setState((p) => {
          if (p.dhikr.eveningDone) return p;
          onActionCompleted(ActionType.EVENING_ADHKAR_COMPLETE, 1, { completed: true });
          return { ...p, dhikr: { ...p.dhikr, eveningDone: true } };
        });
      },
      incrementTasbeeh: () => {
        setState((p) => {
          const c = p.dhikr.tasbeehCount + 1;
          // +10 points for every completed 33-count iteration
          if (c % 33 === 0) onActionCompleted(ActionType.TASBEEH_33, 1, { count: c });
          return { ...p, dhikr: { ...p.dhikr, tasbeehCount: c } };
        });
      },
      resetTasbeeh: () => setState((p) => ({ ...p, dhikr: { ...p.dhikr, tasbeehCount: 0 } })),
      addPoints: (n) => levelService.addPoints(n),
      toggleSetting: (key) => setState((p) => ({ ...p, [key]: !p[key] })),
      setReminderTime: (t) => setState((p) => ({ ...p, reminderTime: t })),
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

// Dynamic level names — recomputed from the live (admin-overridable) level list.
export const LEVEL_NAMES = new Proxy([] as string[], {
  get(_t, prop) {
    const names = levelService.getLevels().map((l) => l.name);
    // @ts-expect-error — passthrough to underlying array
    return names[prop];
  },
});
