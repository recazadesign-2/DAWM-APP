import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/content")({
  component: ContentPage,
});

interface DailyRow {
  id: string;
  content_date: string;
  content_type: string;
  arabic_text: string;
  reference: string | null;
  is_active: boolean;
}

function ContentPage() {
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    content_date: new Date().toISOString().slice(0,10),
    content_type: "ayah",
    arabic_text: "",
    reference: "",
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("daily_content").select("*").order("content_date", { ascending: false }).limit(60);
    setRows((data as DailyRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.arabic_text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("daily_content").insert({
      content_date: form.content_date,
      content_type: form.content_type,
      arabic_text: form.arabic_text.trim(),
      reference: form.reference || null,
    });
    setBusy(false);
    if (error) { alert(error.message); return; }
    setForm({ ...form, arabic_text: "", reference: "" });
    load();
  };

  const toggleActive = async (r: DailyRow) => {
    await supabase.from("daily_content").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف هذا المحتوى؟")) return;
    await supabase.from("daily_content").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">إدارة المحتوى</h2>
      <p className="text-sm text-muted-foreground mb-6">آية اليوم، خاطرة، حديث — يظهر تلقائياً في الواجهة الرئيسية حسب التاريخ.</p>

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h3 className="font-semibold">إضافة محتوى جديد</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <input type="date" value={form.content_date}
            onChange={(e) => setForm({ ...form, content_date: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={form.content_type}
            onChange={(e) => setForm({ ...form, content_type: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="ayah">آية</option>
            <option value="khatra">خاطرة</option>
            <option value="hadith">حديث</option>
          </select>
          <input placeholder="المرجع (اختياري)" value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <textarea
          placeholder="النص العربي…"
          value={form.arabic_text}
          onChange={(e) => setForm({ ...form, arabic_text: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-quran text-lg leading-loose"
        />
        <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} إضافة
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-right px-3 py-2">التاريخ</th>
                <th className="text-right px-3 py-2">النوع</th>
                <th className="text-right px-3 py-2">النص</th>
                <th className="text-right px-3 py-2">المرجع</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs tabular-nums">{r.content_date}</td>
                  <td className="px-3 py-2 text-xs">{r.content_type}</td>
                  <td className="px-3 py-2 font-quran text-base">{r.arabic_text}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.reference}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <label className="text-xs flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={r.is_active} onChange={() => toggleActive(r)} />
                        فعّال
                      </label>
                      <button onClick={() => remove(r.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-center text-sm text-muted-foreground py-8">لا يوجد محتوى بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}