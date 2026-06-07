// ────────────────────────────────────────────────────────────────
// Settings Service — Dynamic Engine Configuration
// ────────────────────────────────────────────────────────────────
// Single source of truth for runtime-tunable engine parameters
// (time thresholds, point values, adhkar timings). Backed by
// `public.global_settings` with realtime propagation.
//
// Pattern: bootstrap once on module load → cache in-memory →
// subscribe to postgres_changes → any save instantly mutates
// the live calculation engine across all clients.

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type SettingsKey =
  | "min_continuous_time"
  | "max_cumulative_time"
  | "buffer_time_limit"
  | "morning_adhkar_threshold"
  | "evening_adhkar_threshold"
  | "points_quran_page"
  | "points_quran_wird_bonus"
  | "points_morning_adhkar"
  | "points_evening_adhkar"
  | "points_tasbeeh_33";

export const SETTINGS_DEFAULTS: Record<SettingsKey, number> = {
  min_continuous_time: 120,
  max_cumulative_time: 300,
  buffer_time_limit: 10,
  morning_adhkar_threshold: 60,
  evening_adhkar_threshold: 60,
  points_quran_page: 5,
  points_quran_wird_bonus: 5,
  points_morning_adhkar: 10,
  points_evening_adhkar: 10,
  points_tasbeeh_33: 10,
};

const cache = new Map<string, number>();
let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("settings-changed"));
  }
}

async function bootstrap() {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    try {
      const { data } = await (supabase.from("global_settings" as any) as any)
        .select("key,value");
      if (Array.isArray(data)) {
        for (const row of data) {
          const v = typeof row.value === "number" ? row.value : Number(row.value);
          if (!Number.isNaN(v)) cache.set(row.key, v);
        }
      }
      // realtime subscription
      supabase
        .channel("global-settings")
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "global_settings" },
          (payload: any) => {
            const row = payload.new ?? payload.old;
            if (!row?.key) return;
            const v = typeof row.value === "number" ? row.value : Number(row.value);
            if (!Number.isNaN(v)) cache.set(row.key, v);
            emitChange();
          },
        )
        .subscribe();
      bootstrapped = true;
      emitChange();
    } catch {
      /* fall back to defaults */
    }
  })();
  return bootstrapPromise;
}

// Kick off bootstrap immediately in browser
if (typeof window !== "undefined") {
  void bootstrap();
}

export function getSetting(key: SettingsKey): number {
  const v = cache.get(key);
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return SETTINGS_DEFAULTS[key];
}

export async function ensureSettingsLoaded() {
  await bootstrap();
}

export async function updateSetting(key: SettingsKey, value: number) {
  const { error } = await (supabase.from("global_settings" as any) as any).upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  cache.set(key, value);
  emitChange();
}

export async function fetchAllSettings(): Promise<Record<SettingsKey, number>> {
  await bootstrap();
  const out: Record<string, number> = { ...SETTINGS_DEFAULTS };
  cache.forEach((v, k) => (out[k] = v));
  return out as Record<SettingsKey, number>;
}

export function useSetting(key: SettingsKey): number {
  const [val, setVal] = useState(() => getSetting(key));
  useEffect(() => {
    const handler = () => setVal(getSetting(key));
    window.addEventListener("settings-changed", handler);
    void bootstrap().then(handler);
    return () => window.removeEventListener("settings-changed", handler);
  }, [key]);
  return val;
}
