import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag, CheckCircle2, Loader2, Inbox } from "lucide-react";

export const Route = createFileRoute("/admin/support")({
  component: SupportPage,
});

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  status: "open" | "flagged" | "resolved";
  priority: "low" | "normal" | "high";
  created_at: string;
  resolution_note: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  open: "مفتوحة",
  flagged: "موسومة",
  resolved: "محلولة",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  flagged: "bg-amber-500/10 text-amber-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
};

function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "flagged" | "resolved">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = (supabase.from("support_tickets" as any) as any).select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setTickets((data || []) as Ticket[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function setStatus(id: string, status: Ticket["status"], note?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: any = { status, updated_at: new Date().toISOString() };
    if (status === "resolved") {
      payload.resolved_by = user.id;
      if (note) payload.resolution_note = note;
    }
    await (supabase.from("support_tickets" as any) as any).update(payload).eq("id", id);
    await (supabase.from("admin_audit_log" as any) as any).insert({
      admin_id: user.id,
      action: `ticket.${status}`,
      target_type: "ticket",
      target_id: id,
    });
    toast.success("تم");
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold mb-1">الدعم والبلاغات</h2>
        <p className="text-sm text-muted-foreground">إدارة بلاغات وادعاءات المستخدمين.</p>
      </div>

      <div className="flex gap-2">
        {(["all", "open", "flagged", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "الكل" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2" />
          <p className="text-sm">لا توجد بلاغات.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-elegant)" }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{t.subject}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    {t.priority === "high" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">عاجل</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {t.user_id.slice(0, 8)} • {new Date(t.created_at).toLocaleString("ar-EG")}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {t.status !== "flagged" && t.status !== "resolved" && (
                    <button onClick={() => setStatus(t.id, "flagged")} className="px-2 py-1 rounded-md text-xs bg-amber-500/10 text-amber-600 flex items-center gap-1">
                      <Flag size={12} /> وسم
                    </button>
                  )}
                  {t.status !== "resolved" && (
                    <button onClick={() => setStatus(t.id, "resolved")} className="px-2 py-1 rounded-md text-xs bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> حلّ
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</p>
              {t.resolution_note && (
                <div className="mt-3 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                  ملاحظة الحل: {t.resolution_note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
