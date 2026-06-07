import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/editor")({
  component: LiveEditor,
});

interface Row {
  id: string;
  key: string;
  value: string;
  screen: string | null;
  description: string | null;
}

function LiveEditor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("dynamic_strings").select("*").order("screen").order("key");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (row: Row) => {
    const newVal = drafts[row.id] ?? row.value;
    setSavingId(row.id);
    await supabase.from("dynamic_strings").update({ value: newVal }).eq("id", row.id);
    setSavingId(null);
    setDrafts((d) => { const { [row.id]: _, ...rest } = d; return rest; });
    setRows((r) => r.map((x) => x.id === row.id ? { ...x, value: newVal } : x));
  };

  const addNew = async () => {
    const key = prompt("مفتاح النص الجديد (مثال: home.cta_button)");
    if (!key) return;
    const value = prompt("النص:") ?? "";
    const screen = prompt("الشاشة (اختياري، مثل home):") ?? null;
    const { error } = await supabase.from("dynamic_strings").insert({ key, value, screen });
    if (error) alert(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا النص؟")) return;
    await supabase.from("dynamic_strings").delete().eq("id", id);
    load();
  };

  const filtered = rows.filter(r =>
    !filter ||
    r.key.toLowerCase().includes(filter.toLowerCase()) ||
    r.value.includes(filter) ||
    (r.screen ?? "").includes(filter)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold">المحرر المباشر</h2>
        <button onClick={addNew} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm">
          <Plus size={14} /> نص جديد
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">عدّل نصوص الواجهة، وستظهر التحديثات فوراً لدى المستخدمين.</p>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="بحث عن مفتاح أو نص…"
        className="w-full md:w-80 rounded-lg border border-border bg-background px-3 py-2 text-sm mb-4"
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-right px-3 py-2 w-1/4">المفتاح</th>
                <th className="text-right px-3 py-2">القيمة</th>
                <th className="text-right px-3 py-2 w-24">الشاشة</th>
                <th className="px-3 py-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const dirty = drafts[row.id] !== undefined && drafts[row.id] !== row.value;
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 align-top">
                      <code className="text-xs text-primary">{row.key}</code>
                      {row.description && <div className="text-[11px] text-muted-foreground mt-1">{row.description}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={drafts[row.id] ?? row.value}
                        onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                        rows={1}
                        className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.screen ?? "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => save(row)}
                          disabled={!dirty || savingId === row.id}
                          className="p-1.5 rounded-md text-primary hover:bg-primary/10 disabled:opacity-30"
                          aria-label="حفظ"
                        >
                          {savingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        </button>
                        <button onClick={() => remove(row.id)} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10" aria-label="حذف">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center text-sm text-muted-foreground py-8">لا نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}