import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

interface Setting { key: string; value: any; description: string | null; }

function SettingsPage() {
  const [items, setItems] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("app_settings").select("*").order("key");
    setItems((data as Setting[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setBool = async (key: string, val: boolean) => {
    await supabase.from("app_settings").update({ value: val }).eq("key", key);
    setItems((arr) => arr.map((s) => s.key === key ? { ...s, value: val } : s));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">الإعدادات</h2>
      <p className="text-sm text-muted-foreground mb-6">مفاتيح تشغيل عامة للتطبيق.</p>

      <div className="space-y-3 max-w-xl">
        {items.map((s) => {
          const isBool = typeof s.value === "boolean";
          return (
            <div key={s.key} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-primary">{s.key}</div>
                {s.description && <div className="text-sm text-foreground mt-1">{s.description}</div>}
                {!isBool && <div className="text-xs text-muted-foreground mt-1">القيمة: <code>{JSON.stringify(s.value)}</code></div>}
              </div>
              {isBool && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={!!s.value} onChange={(e) => setBool(s.key, e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5"></div>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}