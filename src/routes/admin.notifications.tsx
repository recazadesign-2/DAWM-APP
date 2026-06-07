import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Bell } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

interface LogRow { id: string; title: string; body: string; sent_count: number; failed_count: number; created_at: string; }

function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogRow[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [{ data: l }, { count }] = await Promise.all([
      supabase.from("notifications_log").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    ]);
    setLog((l as LogRow[]) ?? []);
    setSubCount(count ?? 0);
  };
  useEffect(() => { load(); }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/admin/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ title, body, url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل الإرسال");
      setMsg(`أُرسلت إلى ${json.sent} مشترك (فشل: ${json.failed}).`);
      setTitle(""); setBody("");
      load();
    } catch (err: any) {
      setMsg(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">الإشعارات</h2>
      <p className="text-sm text-muted-foreground mb-6">
        إرسال إشعارات Push للمستخدمين المشتركين ({subCount} حالياً).
      </p>

      <form onSubmit={send} className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-3 max-w-xl">
        <div className="flex items-center gap-2"><Bell size={16} className="text-primary" /><h3 className="font-semibold">إشعار جديد</h3></div>
        <input required placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <textarea required placeholder="نص الرسالة" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={200}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input placeholder="رابط الفتح (اختياري)" value={url} onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        {msg && <p className="text-xs text-foreground">{msg}</p>}
        <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} إرسال
        </button>
        <p className="text-[11px] text-muted-foreground">
          ملاحظة: يتطلب إعداد مفاتيح VAPID في إعدادات الخادم. اتصل بالمسؤول إذا ظهرت رسالة عدم تهيئة المفاتيح.
        </p>
      </form>

      <h3 className="font-semibold mb-2 text-sm">سجل الإشعارات</h3>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-right px-3 py-2">التاريخ</th>
              <th className="text-right px-3 py-2">العنوان</th>
              <th className="text-right px-3 py-2">النص</th>
              <th className="text-right px-3 py-2">أُرسل</th>
              <th className="text-right px-3 py-2">فشل</th>
            </tr>
          </thead>
          <tbody>
            {log.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs tabular-nums">{new Date(r.created_at).toLocaleString("ar")}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.body}</td>
                <td className="px-3 py-2 text-xs">{r.sent_count}</td>
                <td className="px-3 py-2 text-xs">{r.failed_count}</td>
              </tr>
            ))}
            {log.length === 0 && <tr><td colSpan={5} className="text-center text-sm text-muted-foreground py-8">لم يُرسل إشعار بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}