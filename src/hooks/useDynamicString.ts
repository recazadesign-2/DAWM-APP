import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();
const listeners = new Set<() => void>();
let loaded = false;
let loadingPromise: Promise<void> | null = null;

async function loadAll() {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const { data } = await supabase.from("dynamic_strings").select("key,value");
    (data ?? []).forEach((r: any) => cache.set(r.key, r.value));
    loaded = true;
    listeners.forEach((l) => l());
  })();
  return loadingPromise;
}

export function useDynamicString(key: string, fallback: string): string {
  const [, force] = useState(0);
  useEffect(() => {
    loadAll();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  // realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("dynamic_strings_changes_" + key)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "dynamic_strings", filter: `key=eq.${key}` },
        (payload: any) => {
          if (payload.new?.value) {
            cache.set(key, payload.new.value);
            force((n) => n + 1);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [key]);

  return cache.get(key) ?? fallback;
}