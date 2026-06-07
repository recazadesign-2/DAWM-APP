import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { History, Send, FlaskConical, Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/admin/advanced")({
  component: AdvancedPage,
});

type Tab = "audit" | "push" | "sandbox";

function AdvancedPage() {
  const [tab, setTab] = useState<Tab>("audit");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold mb-1">الوحدات المتقدمة</h2>
        <p className="text-sm text-muted-foreground">سجل التدقيق، مركز الإشعارات، وصندوق فحص المستخدمين.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {[
          { id: "audit" as const, label: "سجل التدقيق", icon: History },
          { id: "push" as const, label: "مركز الإشعارات", icon: Send },
          { id: "sandbox" as const, label: "صندوق المستخدم", icon: FlaskConical },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "audit" && <AuditLog />}
      {tab === "push" && <PushHub />}
      {tab === "sandbox" && <UserSandbox />}
    </div>
  );
}

function AuditLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("admin_audit_log" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-right border-b border-border bg-muted/30 text-muted-foreground text-xs">
            <th className="py-2 px-3">الوقت</th>
            <th className="py-2 px-3">المشرف</th>
            <th className="py-2 px-3">الإجراء</th>
            <th className="py-2 px-3">الهدف</th>
            <th className="py-2 px-3">تفاصيل</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">لا توجد إجراءات.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="border-b border-border/50">
              <td className="py-2 px-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
              <td className="py-2 px-3 text-[11px] font-mono">{r.admin_id.slice(0, 8)}</td>
              <td className="py-2 px-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.action}</span></td>
              <td className="py-2 px-3 text-xs">{r.target_type} {r.target_id ? `· ${r.target_id.slice(0, 12)}` : ""}</td>
              <td className="py-2 px-3 text-[11px] text-muted-foreground font-mono max-w-xs truncate">
                {r.metadata ? JSON.stringify(r.metadata) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PushHub() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "user">("all");
  const [userId, setUserId] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (title.trim().length < 2) return toast.error("العنوان مطلوب");
    if (body.trim().length < 2) return toast.error("النص مطلوب");
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          ...(target === "user" ? { user_id: userId.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase.from("admin_audit_log" as any) as any).insert({
          admin_id: user.id,
          action: "push.send",
          target_type: target === "user" ? "user" : "broadcast",
          target_id: target === "user" ? userId.trim() : null,
          metadata: { title: title.trim() },
        });
      }
      toast.success("تم الإرسال");
      setTitle(""); setBody("");
    } catch (e: any) {
      toast.error(e?.message || "فشل الإرسال");
    } finally { setSending(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4" style={{ boxShadow: "var(--shadow-elegant)" }}>
      <h3 className="font-semibold">إنشاء إشعار</h3>
      <div className="flex gap-2">
        <button onClick={() => setTarget("all")} className={`px-3 py-1.5 rounded-lg text-xs ${target === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>للجميع</button>
        <button onClick={() => setTarget("user")} className={`px-3 py-1.5 rounded-lg text-xs ${target === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>مستخدم محدد</button>
      </div>
      {target === "user" && (
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="معرّف المستخدم (UUID)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" />
      )}
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان" maxLength={80} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="نص الإشعار" rows={3} maxLength={300} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      <button onClick={send} disabled={sending} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} إرسال
      </button>
    </div>
  );
}

function UserSandbox() {
  const [uid, setUid] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (uid.trim().length < 8) return toast.error("معرّف غير صحيح");
    setLoading(true);
    setData(null);
    try {
      const [profileRes, progressRes, banRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid.trim()).maybeSingle(),
        supabase.from("user_daily_progress").select("*").eq("user_id", uid.trim()).order("date", { ascending: false }).limit(14),
        (supabase.from("user_bans" as any) as any).select("*").eq("user_id", uid.trim()).maybeSingle(),
      ]);
      if (!profileRes.data) { toast.error("المستخدم غير موجود"); return; }
      setData({ profile: profileRes.data, progress: progressRes.data || [], ban: banRes.data });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <h3 className="font-semibold mb-3">فحص ملف مستخدم (للتصحيح فقط — قراءة)</h3>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
            <Search size={14} className="text-muted-foreground" />
            <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="UUID المستخدم" className="flex-1 bg-transparent py-2 text-sm font-mono focus:outline-none" />
          </div>
          <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {loading ? "…" : "فحص"}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h4 className="font-semibold mb-2">الملف الشخصي</h4>
            <div className="flex items-center gap-3">
              {data.profile.avatar_url && <img src={data.profile.avatar_url} alt="" className="w-12 h-12 rounded-full" />}
              <div>
                <div className="font-medium">{data.profile.display_name || "—"}</div>
                <div className="text-xs text-muted-foreground font-mono">{data.profile.id}</div>
                {data.ban && !data.ban.unbanned_at && (
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">محظور</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h4 className="font-semibold mb-3">تقدم آخر 14 يوم</h4>
            {data.progress.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-muted-foreground border-b border-border">
                    <th className="py-1.5">التاريخ</th>
                    <th className="py-1.5">صفحات</th>
                    <th className="py-1.5">الهدف</th>
                    <th className="py-1.5">نسبة</th>
                    <th className="py-1.5">نقاط</th>
                    <th className="py-1.5">صباح</th>
                    <th className="py-1.5">مساء</th>
                  </tr>
                </thead>
                <tbody>
                  {data.progress.map((p: any) => (
                    <tr key={p.date} className="border-b border-border/50">
                      <td className="py-1.5 tabular-nums">{p.date}</td>
                      <td className="py-1.5 tabular-nums">{p.quran_pages_read ?? 0}</td>
                      <td className="py-1.5 tabular-nums">{p.quran_target ?? 0}</td>
                      <td className="py-1.5 tabular-nums">{p.completion_pct ?? 0}%</td>
                      <td className="py-1.5 tabular-nums">{p.points ?? 0}</td>
                      <td className="py-1.5">{p.morning_done ? "✓" : "—"}</td>
                      <td className="py-1.5">{p.evening_done ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
