import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, MapPin, Loader2, Navigation } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Coordinates, PrayerTimes, CalculationMethod, Madhab } from "adhan";
import { BottomTabBar } from "@/components/BottomTabBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COUNTRIES, qiblaBearing } from "@/data/locations";

export const Route = createFileRoute("/prayer")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — مواقيت الصلاة" },
      { name: "description", content: "مواقيت الصلوات الخمس واتجاه القبلة." },
    ],
  }),
  component: PrayerPage,
});

type Settings = {
  latitude: number;
  longitude: number;
  timezone: string;
  method: string;
  madhab: string;
  notify_fajr: boolean;
  notify_dhuhr: boolean;
  notify_asr: boolean;
  notify_maghrib: boolean;
  notify_isha: boolean;
};

// Consensus defaults (no user choice):
// - MuslimWorldLeague: globally accepted calculation method
// - Shafi: standard Asr (followed by majority of Sunni schools)
const METHOD = "MuslimWorldLeague";
const MADHAB = "Shafi";

const DEFAULTS: Settings = {
  latitude: 30.0444, longitude: 31.2357,
  timezone: "Africa/Cairo",
  method: METHOD, madhab: MADHAB,
  notify_fajr: true, notify_dhuhr: true, notify_asr: true, notify_maghrib: true, notify_isha: true,
};

const PRAYER_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_AR: Record<string, string> = {
  fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر",
  asr: "العصر", maghrib: "المغرب", isha: "العشاء",
};

function fmtTime(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function findLocationLabel(lat: number, lng: number): string {
  for (const c of COUNTRIES) {
    for (const city of c.cities) {
      if (Math.abs(city.lat - lat) < 0.01 && Math.abs(city.lng - lng) < 0.01) {
        return `${city.name} — ${c.name}`;
      }
    }
  }
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

function PrayerPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(new Date());
  const [countryCode, setCountryCode] = useState<string>("EG");
  const [cityName, setCityName] = useState<string>("القاهرة");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("user_prayer_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (data) {
        setSettings({
          latitude: data.latitude, longitude: data.longitude, timezone: data.timezone,
          method: METHOD, madhab: MADHAB,
          notify_fajr: data.notify_fajr, notify_dhuhr: data.notify_dhuhr,
          notify_asr: data.notify_asr, notify_maghrib: data.notify_maghrib, notify_isha: data.notify_isha,
        });
        // try to back-fill country/city dropdowns
        for (const c of COUNTRIES) {
          const m = c.cities.find((ci) => Math.abs(ci.lat - data.latitude) < 0.01 && Math.abs(ci.lng - data.longitude) < 0.01);
          if (m) { setCountryCode(c.code); setCityName(m.name); break; }
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  const times = useMemo(() => {
    const coords = new Coordinates(settings.latitude, settings.longitude);
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Shafi;
    const pt = new PrayerTimes(coords, now, params);
    return PRAYER_KEYS.map((k) => ({ key: k, name: PRAYER_AR[k], date: (pt as any)[k] as Date }));
  }, [settings, now]);

  const activeIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < times.length; i++) if (times[i].date.getTime() <= now.getTime()) idx = i;
    return idx;
  }, [times, now]);

  async function save(next: Settings) {
    if (!user) {
      setSettings(next);
      return;
    }
    setSaving(true);
    setSettings(next);
    await supabase.from("user_prayer_settings").upsert({ user_id: user.id, ...next });
    setSaving(false);
  }

  function selectCountry(code: string) {
    const c = COUNTRIES.find((x) => x.code === code);
    if (!c) return;
    setCountryCode(code);
    const city = c.cities[0];
    setCityName(city.name);
    save({ ...settings, latitude: city.lat, longitude: city.lng, timezone: c.timezone });
  }

  function selectCity(name: string) {
    const city = country.cities.find((c) => c.name === name);
    if (!city) return;
    setCityName(name);
    save({ ...settings, latitude: city.lat, longitude: city.lng, timezone: country.timezone });
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-[460px] mx-auto px-5 pt-6">
        <header className="flex items-center justify-between mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowRight size={22} />
          </Link>
          <h1 className="text-lg font-bold font-display">مواقيت الصلاة</h1>
          <div className="w-6" />
        </header>

        <div
          className="rounded-2xl p-4 border border-border bg-card flex items-center gap-3 mb-4"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <MapPin size={18} className="text-primary" />
          <div className="flex-1 text-right">
            <div className="text-xs text-muted-foreground">الموقع</div>
            <div className="text-sm font-bold">
              {findLocationLabel(settings.latitude, settings.longitude)}
            </div>
            <div className="text-[10px] text-muted-foreground">{settings.timezone}</div>
          </div>
          <button onClick={() => setShowSettings((s) => !s)} className="text-xs text-primary">
            {showSettings ? "إغلاق" : "تغيير"}
          </button>
        </div>

        {showSettings && (
          <div className="rounded-2xl p-4 border border-border bg-card mb-4 space-y-3" style={{ boxShadow: "var(--shadow-elegant)" }}>
            {!user && (
              <p className="text-xs text-muted-foreground">
                سجّل دخولك لحفظ الموقع وتلقي إشعارات الصلاة المخصصة.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                <span className="text-muted-foreground">الدولة</span>
                <select value={countryCode}
                  onChange={(e) => selectCountry(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-2 py-2">
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground">المحافظة / المدينة</span>
                <select value={cityName}
                  onChange={(e) => selectCity(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-2 py-2">
                  {country.cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2">
              طريقة الحساب: <b>رابطة العالم الإسلامي</b> — الأكثر اعتماداً عالمياً.
              <br />
              حساب العصر: <b>الجمهور (الشافعي/المالكي/الحنبلي)</b>.
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border">إشعارات الصلوات</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(["fajr","dhuhr","asr","maghrib","isha"] as const).map((k) => {
                const flag = `notify_${k}` as keyof Settings;
                return (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={!!settings[flag]}
                      onChange={(e) => save({ ...settings, [flag]: e.target.checked })}
                      disabled={!user} />
                    <span>{PRAYER_AR[k]}</span>
                  </label>
                );
              })}
            </div>
            {saving && <p className="text-[10px] text-muted-foreground">جاري الحفظ…</p>}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <ul className="space-y-2">
            {times.map((p, i) => {
              const active = i === activeIdx;
              return (
                <li key={p.key}
                  className={`flex items-center justify-between rounded-2xl p-4 border ${
                    active ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                  style={{ boxShadow: active ? "var(--shadow-glow)" : "var(--shadow-elegant)" }}>
                  <span className="text-base font-bold">{p.name}</span>
                  <span className={`text-base tabular-nums font-display ${active ? "text-primary" : "text-foreground"}`}>
                    {fmtTime(p.date, settings.timezone)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <QiblaCompass lat={settings.latitude} lng={settings.longitude} />
      </div>
      <BottomTabBar />
    </main>
  );
}

function QiblaCompass({ lat, lng }: { lat: number; lng: number }) {
  const qibla = useMemo(() => qiblaBearing(lat, lng), [lat, lng]);
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listening = useRef(false);

  function attach() {
    if (listening.current) return;
    listening.current = true;
    const handler = (e: DeviceOrientationEvent) => {
      // iOS provides webkitCompassHeading (true heading clockwise from north)
      const webkit = (e as any).webkitCompassHeading as number | undefined;
      if (typeof webkit === "number") {
        setHeading(webkit);
      } else if (typeof e.alpha === "number") {
        // Android: alpha is counter-clockwise from north
        setHeading(360 - e.alpha);
      }
    };
    window.addEventListener("deviceorientationabsolute" as any, handler, true);
    window.addEventListener("deviceorientation", handler, true);
  }

  async function enable() {
    setError(null);
    try {
      const anyDOE = DeviceOrientationEvent as any;
      if (typeof anyDOE?.requestPermission === "function") {
        const res = await anyDOE.requestPermission();
        if (res !== "granted") {
          setError("لم يتم السماح للوصول إلى الحساسات");
          return;
        }
      }
      setNeedsPermission(false);
      attach();
    } catch {
      setError("الحساسات غير متاحة على هذا الجهاز");
    }
  }

  useEffect(() => {
    const anyDOE = DeviceOrientationEvent as any;
    if (typeof anyDOE?.requestPermission === "function") {
      setNeedsPermission(true);
    } else if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      attach();
    } else {
      setError("الحساسات غير متاحة على هذا الجهاز");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotation = heading == null ? qibla : (qibla - heading + 360) % 360;
  const aligned = heading != null && Math.abs(((rotation + 180) % 360) - 180) < 8;

  return (
    <section
      className="mt-5 rounded-3xl p-6 border border-border bg-card flex flex-col items-center"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div className="text-sm font-bold mb-1">اتجاه القبلة</div>
      <div className="text-[11px] text-muted-foreground mb-3 tabular-nums">
        {qibla.toFixed(1)}° من الشمال
        {heading != null && <> · البوصلة: {Math.round(heading)}°</>}
      </div>
      <div className="relative w-48 h-48 rounded-full border-2 border-primary/30 flex items-center justify-center">
        <Compass size={170} className="text-primary/30" strokeWidth={1} />
        <div
          className="absolute inset-0 flex items-start justify-center transition-transform duration-200"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="flex flex-col items-center">
            <Navigation
              size={26}
              className={aligned ? "text-accent" : "text-primary"}
              fill="currentColor"
              style={{ marginTop: 8 }}
            />
            <div
              className="w-1 h-16 rounded-full mt-0.5"
              style={{ background: aligned ? "var(--accent, var(--primary))" : "var(--gradient-primary)" }}
            />
          </div>
        </div>
        <div className="absolute bottom-2 text-[10px] text-muted-foreground">جنوب</div>
        <div className="absolute top-2 text-[10px] text-muted-foreground">شمال</div>
      </div>
      {aligned && (
        <p className="mt-3 text-xs text-accent font-bold">أنت متجه للقبلة ✓</p>
      )}
      {needsPermission && (
        <button
          onClick={enable}
          className="mt-3 rounded-xl px-4 py-2 text-xs font-bold bg-primary text-primary-foreground"
        >
          تفعيل البوصلة
        </button>
      )}
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
      {!needsPermission && heading == null && !error && (
        <p className="mt-3 text-[11px] text-muted-foreground">حرّك جهازك لمعايرة البوصلة…</p>
      )}
    </section>
  );
}
