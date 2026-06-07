import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { Coordinates, PrayerTimes, CalculationMethod, Madhab } from "adhan";

type Row = {
  user_id: string;
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

const METHODS: Record<string, () => any> = {
  MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
  Egyptian: () => CalculationMethod.Egyptian(),
  Karachi: () => CalculationMethod.Karachi(),
  UmmAlQura: () => CalculationMethod.UmmAlQura(),
  Dubai: () => CalculationMethod.Dubai(),
  Qatar: () => CalculationMethod.Qatar(),
  Kuwait: () => CalculationMethod.Kuwait(),
  MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
  Singapore: () => CalculationMethod.Singapore(),
  Turkey: () => CalculationMethod.Turkey(),
  Tehran: () => CalculationMethod.Tehran(),
  NorthAmerica: () => CalculationMethod.NorthAmerica(),
};

const PRAYER_LABELS: Record<string, { title: string; flag: keyof Row }> = {
  fajr: { title: "حان وقت صلاة الفجر", flag: "notify_fajr" },
  dhuhr: { title: "حان وقت صلاة الظهر", flag: "notify_dhuhr" },
  asr: { title: "حان وقت صلاة العصر", flag: "notify_asr" },
  maghrib: { title: "حان وقت صلاة المغرب", flag: "notify_maghrib" },
  isha: { title: "حان وقت صلاة العشاء", flag: "notify_isha" },
};

function minutesInTZ(date: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  return h * 60 + m;
}

export const Route = createFileRoute("/api/public/hooks/prayer-tick")({
  server: {
    handlers: {
      POST: async () => {
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
        const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
        const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@dawm.app";
        if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
          return Response.json({ error: "VAPID not configured" }, { status: 500 });
        }
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: rows } = await admin.from("user_prayer_settings").select("*");
        if (!rows?.length) return Response.json({ matched: 0 });

        const now = new Date();
        const date = new Date(now.getTime());
        let totalSent = 0;
        let totalFailed = 0;
        const stale: string[] = [];

        for (const r of rows as Row[]) {
          try {
            const coords = new Coordinates(r.latitude, r.longitude);
            const params = (METHODS[r.method] ?? METHODS.Egyptian)();
            params.madhab = r.madhab === "Hanafi" ? Madhab.Hanafi : Madhab.Shafi;
            const pt = new PrayerTimes(coords, date, params);

            const nowMin = minutesInTZ(now, r.timezone);
            let matched: { key: string; title: string } | null = null;
            for (const [key, info] of Object.entries(PRAYER_LABELS)) {
              if (!r[info.flag]) continue;
              const t = (pt as any)[key] as Date;
              const pm = minutesInTZ(t, r.timezone);
              if (pm === nowMin) { matched = { key, title: info.title }; break; }
            }
            if (!matched) continue;

            const { data: subs } = await admin
              .from("push_subscriptions")
              .select("id,endpoint,p256dh,auth")
              .eq("user_id", r.user_id);

            await Promise.all((subs ?? []).map(async (s: any) => {
              try {
                await webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  JSON.stringify({ title: matched!.title, body: "أقم الصلاة لذكري", url: "/prayer" }),
                );
                totalSent++;
              } catch (e: any) {
                totalFailed++;
                if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(s.id);
              }
            }));
          } catch (e) {
            console.error("prayer-tick user error", r.user_id, e);
          }
        }
        if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);

        return Response.json({ sent: totalSent, failed: totalFailed });
      },
    },
  },
});
