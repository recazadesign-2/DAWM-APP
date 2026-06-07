import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getVapidPublicKey(): Promise<string | null> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "vapid_public_key").maybeSingle();
  if (data?.value && typeof data.value === "string") return data.value;
  return null;
}

export async function subscribeToPush(): Promise<{ ok: boolean; message: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "متصفحك لا يدعم الإشعارات." };
  }
  const vapid = await getVapidPublicKey();
  if (!vapid) return { ok: false, message: "لم يتم تهيئة مفاتيح الإشعارات بعد." };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, message: "تم رفض إذن الإشعارات." };

  const reg = await navigator.serviceWorker.register("/sw.js");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }
  const json = sub.toJSON() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "سجّل دخولك أولاً." };

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: "endpoint" });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "تم تفعيل الإشعارات." };
}