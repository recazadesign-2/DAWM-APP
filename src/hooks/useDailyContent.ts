import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTodayAyah } from "@/data/dailyAyahs";

export interface DailyItem {
  arabic_text: string;
  reference: string | null;
  content_type: string;
}

export function useDailyContent(type: "ayah" | "khatra" | "hadith" = "ayah", fallback?: DailyItem) {
  // Ayah of the day cycles through a static 30-ayah set based on day-of-year.
  // This guarantees the same ayah repeats every 30 days regardless of DB state.
  const initial: DailyItem | null =
    type === "ayah"
      ? { ...getTodayAyah(), content_type: "ayah" }
      : (fallback ?? null);

  const [item, setItem] = useState<DailyItem | null>(initial);

  useEffect(() => {
    if (type === "ayah") {
      setItem({ ...getTodayAyah(), content_type: "ayah" });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const { data } = await supabase
        .from("daily_content")
        .select("arabic_text,reference,content_type")
        .eq("content_type", type)
        .eq("is_active", true)
        .lte("content_date", today)
        .order("content_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setItem(data as DailyItem);
    })();
  }, [type]);

  return item;
}
