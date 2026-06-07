// Lightweight in-app notification scheduler.
// - Daily goal reminder at user's chosen time (cancels if wird already done)
// - 24-hour "gap" reminder if reading wasn't opened today
//
// Uses the browser Notification API + the existing service worker for display.
// Requires permission; silently no-ops without it.

import { progressService } from "./progressService";

const LAST_OPEN_KEY = "dawm:reading:lastOpenedAt";
const LAST_DAILY_FIRED_KEY = "dawm:notif:dailyFiredOn"; // YYYY-MM-DD

export function recordReadingOpened() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function getLastOpened(): number {
  if (typeof window === "undefined") return Date.now();
  const raw = localStorage.getItem(LAST_OPEN_KEY);
  return raw ? parseInt(raw, 10) || Date.now() : Date.now();
}

async function showNotification(title: string, body: string, url = "/reading") {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: title,
        data: { url },
      });
    } else {
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

/**
 * Parse "HH:MM" into next future Date.
 */
function nextOccurrence(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  const now = new Date();
  const target = new Date(now);
  target.setHours(isNaN(h) ? 8 : h, isNaN(m) ? 0 : m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target;
}

let dailyTimerId: number | null = null;
let gapIntervalId: number | null = null;

/**
 * Schedule the next daily-goal reminder. Re-call this whenever the
 * user changes their reminder time or completes the wird.
 */
export function scheduleDailyReminder(reminderTime: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  if (dailyTimerId !== null) {
    window.clearTimeout(dailyTimerId);
    dailyTimerId = null;
  }
  if (!enabled) return;

  const target = nextOccurrence(reminderTime);
  const delay = Math.max(1000, target.getTime() - Date.now());

  dailyTimerId = window.setTimeout(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const firedOn = localStorage.getItem(LAST_DAILY_FIRED_KEY);
    const prog = progressService.get();
    const wirdDone = prog.completed;
    if (!wirdDone && firedOn !== today) {
      await showNotification(
        "حان وقت وردك اليومي 📖",
        "لا تدع الدائرة تنقطع — صفحة واحدة الآن تكفي للاستمرار.",
      );
      try {
        localStorage.setItem(LAST_DAILY_FIRED_KEY, today);
      } catch {
        /* ignore */
      }
    }
    // schedule next day
    scheduleDailyReminder(reminderTime, enabled);
  }, delay) as unknown as number;
}

/**
 * Periodic check (every hour) for the 24-hour reading gap.
 */
export function startGapWatcher(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (gapIntervalId !== null) {
    window.clearInterval(gapIntervalId);
    gapIntervalId = null;
  }
  if (!enabled) return;

  const check = async () => {
    const since = Date.now() - getLastOpened();
    if (since >= 24 * 60 * 60 * 1000) {
      const today = new Date().toISOString().slice(0, 10);
      const fired = localStorage.getItem("dawm:notif:gapFiredOn");
      if (fired !== today) {
        await showNotification(
          "لا تدع الدائرة تنقطع 🕊️",
          "صفحة واحدة فقط كفيلة بالاستمرار.",
        );
        try {
          localStorage.setItem("dawm:notif:gapFiredOn", today);
        } catch {
          /* ignore */
        }
      }
    }
  };
  // first run after 5s, then hourly
  window.setTimeout(check, 5000);
  gapIntervalId = window.setInterval(check, 60 * 60 * 1000) as unknown as number;
}

export function ensureServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
