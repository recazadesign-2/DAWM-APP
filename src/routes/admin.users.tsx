import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Ban, Check, Coins, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

interface Row {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  banned: boolean;
}

function UsersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustFor, setAdjustFor] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase.from("profiles").select("id, display_name, avatar_url").limit(100);
    if (q.trim()) query = query.ilike("display_name", `%${q.trim()}%`);
    const { data: profiles } = await query;
    const ids = (profiles || []).map((p: any) => p.id);
    const today = new Date().toISOString().slice(0, 10);
    const [progressRes, bansRes] = await Promise.all([
      ids.length
        ? supabase.from("user_daily_progress").select("user_id, points").in("user_id", ids).eq("date", today)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? (supabase.from("user_bans" as any) as any).select("user_id, unbanned_at").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pmap = new Map((progressRes.data || []).map((r: any) => [r.user_id, r.points || 0]));
    const bset = new Set((bansRes.data || []).filter((r: any) => !r.unbanned_at).map((r: any) => r.user_id));
    setRows(
      (profiles || []).map((p: any) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        points: pmap.get(p.id) ?? 0,
        banned: bset.has(p.id),
      })),
    );
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function toggleBan(row: Row) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      if (row.banned) {
        await (supabase.from("user_bans" as any) as any).update({ unbanned_at: new Date().toISOString() }).eq("user_id", row.id);
      } else {
        await (supabase.from("user_bans" as any) as any).upsert({
          user_id: row.id,
          banned_by: user.id,
          reason: "admin action",
          unbanned_at: null,
        });
      }
      await (supabase.from("admin_audit_log" as any) as any).insert({
        admin_id: user.id,
        action: row.banned ? "user.unban" : "user.ban",
        target_type: "user",
        target_id: row.id,
      });
      toast.success(row.banned ? "تم رفع الحظر" : "تم الحظر");
      load();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">إدارة المستخدمين</h2>
          <p className="text-sm text-muted-foreground">بحث، حظر، وتعديل نقاط يدوي مع تدقيق كامل.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="بحث بالاسم…"
              className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
            />
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            بحث
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">لا يوجد مستخدمون.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-border text-muted-foreground text-xs">
                  <th className="py-2 px-2">المستخدم</th>
                  <th className="py-2 px-2">نقاط اليوم</th>
                  <th className="py-2 px-2">الحالة</th>
                  <th className="py-2 px-2 w-40">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted" />
                        )}
                        <div>
                          <div className="font-medium">{r.display_name || "—"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{r.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 tabular-nums">{r.points.toLocaleString("ar-EG")}</td>
                    <td className="py-2 px-2">
                      {r.banned ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">محظور</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">نشط</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setAdjustFor(r)}
                          className="px-2 py-1 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/15 flex items-center gap-1"
                        >
                          <Coins size={12} /> تعديل
                        </button>
                        <button
                          onClick={() => toggleBan(r)}
                          className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
                            r.banned
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15"
                              : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/15"
                          }`}
                        >
                          {r.banned ? <Check size={12} /> : <Ban size={12} />}
                          {r.banned ? "رفع" : "حظر"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjustFor && (
        <AdjustModal row={adjustFor} onClose={() => { setAdjustFor(null); load(); }} />
      )}
    </div>
  );
}

function AdjustModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!Number.isFinite(delta) || delta === 0) return toast.error("أدخل قيمة غير صفرية");
    if (Math.abs(delta) > 10000) return toast.error("الحد الأقصى ±10000");
    if (reason.trim().length < 5) return toast.error("اذكر سبباً (5 أحرف على الأقل)");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("جلسة منتهية");
      await (supabase.from("point_adjustments" as any) as any).insert({
        user_id: row.id,
        admin_id: user.id,
        delta,
        reason: reason.trim(),
      });
      // Update today's progress points
      const today = new Date().toISOString().slice(0, 10);
      const newPts = Math.max(0, row.points + delta);
      await supabase.from("user_daily_progress").upsert({
        user_id: row.id,
        date: today,
        points: newPts,
      } as any, { onConflict: "user_id,date" } as any);
      await (supabase.from("admin_audit_log" as any) as any).insert({
        admin_id: user.id,
        action: "user.points_adjust",
        target_type: "user",
        target_id: row.id,
        metadata: { delta, reason: reason.trim() },
      });
      toast.success("تم التعديل");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "فشل");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">تعديل نقاط — {row.display_name || row.id.slice(0, 8)}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">التغيير (+/−)</label>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">السبب</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            maxLength={500}
          />
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {saving ? "جارٍ الحفظ…" : "تطبيق التعديل"}
        </button>
      </div>
    </div>
  );
}
