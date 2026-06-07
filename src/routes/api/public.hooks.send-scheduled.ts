import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const Route = createFileRoute("/api/public/hooks/send-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({} as any));
        const title = String(body.title ?? "").slice(0, 80);
        const text = String(body.body ?? "").slice(0, 200);
        const url = typeof body.url === "string" ? body.url.slice(0, 500) : "/";
        if (!title || !text) {
          return Response.json({ error: "title and body required" }, { status: 400 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
        const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
        const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@dawm.app";
        if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
          return Response.json({ error: "VAPID keys not configured" }, { status: 500 });
        }
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("id,endpoint,p256dh,auth");

        let sent = 0, failed = 0;
        const stale: string[] = [];
        await Promise.all((subs ?? []).map(async (s: any) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title, body: text, url }),
            );
            sent++;
          } catch (e: any) {
            failed++;
            if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(s.id);
          }
        }));
        if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);

        await admin.from("notifications_log").insert({
          title, body: text, url, sent_count: sent, failed_count: failed,
        });

        return Response.json({ sent, failed });
      },
    },
  },
});
