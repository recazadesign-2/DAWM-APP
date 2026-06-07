import { useEffect, useMemo, useState } from "react";
import { Coordinates, PrayerTimes, CalculationMethod, Madhab } from "adhan";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AR: Record<string, string> = {
  fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر",
  asr: "العصر", maghrib: "المغرب", isha: "العشاء",
};

const ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

const DEFAULT_COORDS = { lat: 30.0444, lng: 31.2357, tz: "Africa/Cairo" };

export function useNextPrayer() {
  const { user } = useAuth();
  const [loc, setLoc] = useState(DEFAULT_COORDS);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_prayer_settings")
        .select("latitude,longitude,timezone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data) {
        setLoc({ lat: data.latitude, lng: data.longitude, tz: data.timezone });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return useMemo(() => {
    const coords = new Coordinates(loc.lat, loc.lng);
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Shafi;
    const today = new PrayerTimes(coords, now, params);
    const tomorrow = new PrayerTimes(coords, new Date(now.getTime() + 86400000), params);

    let next: { key: string; name: string; date: Date } | null = null;
    for (const k of ORDER) {
      const d = (today as any)[k] as Date;
      if (d.getTime() > now.getTime()) {
        next = { key: k, name: AR[k], date: d };
        break;
      }
    }
    if (!next) {
      const d = (tomorrow as any).fajr as Date;
      next = { key: "fajr", name: AR.fajr, date: d };
    }

    const ms = Math.max(0, next.date.getTime() - now.getTime());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const countdown = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: loc.tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(next.date);

    return { name: next.name, time, countdown };
  }, [loc, now]);
}
