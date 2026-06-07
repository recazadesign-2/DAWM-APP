import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const Route = createFileRoute("/api/admin/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "");
        if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

        const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        // Verify user via JWT and admin role using a user-scoped client
        const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userRes?.user) return Response.json({ error: "invalid token" }, { status: 401 });
        const userId = userRes.user.id;

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: roleRow } = await admin
          .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
        if (!roleRow) return Response.json({ error: "forbidden" }, { status: 403 });

        const body = await request.json().catch(() => ({}));
        const title = String(body.title ?? "").slice(0, 80);
        const text = String(body.body ?? "").slice(0, 200);
        const url = typeof body.url === "string" ? body.url.slice(0, 500) : "/";
        if (!title || !text) return Response.json({ error: "title and body required" }, { status: 400 });

        const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
        const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
        const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@dawm.app";
        if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
          return Response.json({ error: "VAPID keys not configured" }, { status: 500 });
        }
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

        const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth");
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
          title, body: text, url, sent_count: sent, failed_count: failed, created_by: userId,
        });

        return Response.json({ sent, failed });
      },
    },
  },
});