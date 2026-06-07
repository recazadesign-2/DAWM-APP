import { useEffect, useState } from "react";
import { levelService, type LevelInfo } from "@/services/levelService";

/**
 * useLevels — single source of truth for the user's XP & level state.
 * Subscribes to `points-changed` so any screen using it updates live
 * when points are awarded elsewhere (reading, dhikr, streaks, …).
 */
export function useLevels() {
  const [points, setPoints] = useState<number>(() => levelService.getPoints());
  const [info, setInfo] = useState<LevelInfo>(() =>
    levelService.getCurrentLevel(levelService.getPoints()),
  );

  useEffect(() => {
    const sync = (p: number) => {
      setPoints(p);
      setInfo(levelService.getCurrentLevel(p));
    };
    // Re-read on mount in case it changed before hydration
    sync(levelService.getPoints());

    const onPoints = (e: Event) => {
      const d = (e as CustomEvent).detail as { points: number };
      sync(d.points);
    };
    window.addEventListener("points-changed", onPoints);
    return () => window.removeEventListener("points-changed", onPoints);
  }, []);

  return {
    points,
    level: info.current,
    nextLevel: info.next,
    percentage: info.percentage,
    pointsToNext: info.pointsToNext,
    pointsIntoLevel: info.pointsIntoLevel,
    rangeForLevel: info.rangeForLevel,
    info,
  };
}
