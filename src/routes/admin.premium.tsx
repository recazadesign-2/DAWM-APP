import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, Plus, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/premium")({
  head: () => ({ meta: [{ title: "التفعيل المميّز — دَاوِمْ" }] }),
  component: PremiumPage,
});

interface PremiumEmail {
  id: string;
  email: string;
  note: string | null;
  created_at: string;
}

function PremiumPage() {
  const [items, setItems] = useState<PremiumEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("premium_emails")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as PremiumEmail[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("بريد إلكتروني غير صالح");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("premium_emails")
      .insert({ email: trimmed, note: note.trim() || null });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تفعيل البريد بنجاح");
    setEmail("");
    setNote("");
    load();
  };

  const remove = async (id: string, em: string) => {
    if (!confirm(`إلغاء تفعيل ${em}؟`)) return;
    const { error } = await supabase.from("premium_emails").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.filter((x) => x.id !== id));
    toast.success("تم الإلغاء");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <Crown size={20} className="text-primary" /> التفعيل المميّز
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        أضف أي بريد إلكتروني لتفعيل التطبيق بالكامل لصاحبه فور تسجيل الدخول.
      </p>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-4 mb-6 max-w-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="email"
            required
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="ملاحظة (اختياري)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          تفعيل
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد إيميلات مفعّلة بعد.</p>
      ) : (
        <div className="space-y-2 max-w-xl">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.email}</div>
                {it.note && <div className="text-xs text-muted-foreground truncate">{it.note}</div>}
              </div>
              <button
                onClick={() => remove(it.id, it.email)}
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                aria-label="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
