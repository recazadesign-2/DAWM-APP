import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SettingsKey, SETTINGS_DEFAULTS, fetchAllSettings, updateSetting } from "@/services/settingsService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Clock, Sun, Moon, Coins, Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/engine")({
  component: EnginePage,
});

interface FieldDef {
  key: SettingsKey;
  label: string;
  unit: string;
  min: number;
  max: number;
}

const SECTIONS: Array<{ title: string; icon: any; fields: FieldDef[] }> = [
  {
    title: "العتبات الزمنية",
    icon: Clock,
    fields: [
      { key: "min_continuous_time", label: "أقل زمن قراءة متواصل", unit: "ثانية", min: 30, max: 600 },
      { key: "max_cumulative_time", label: "الحد التراكمي الأقصى", unit: "ثانية", min: 60, max: 1200 },
      { key: "buffer_time_limit", label: "زمن الفجوة المسموح", unit: "ثانية", min: 0, max: 60 },
    ],
  },
  {
    title: "أذكار الصباح والمساء",
    icon: Sun,
    fields: [
      { key: "morning_adhkar_threshold", label: "عتبة أذكار الصباح", unit: "ثانية", min: 10, max: 600 },
      { key: "evening_adhkar_threshold", label: "عتبة أذكار المساء", unit: "ثانية", min: 10, max: 600 },
    ],
  },
  {
    title: "قيم النقاط (محرك المكافآت الديناميكي)",
    icon: Coins,
    fields: [
      { key: "points_quran_page", label: "نقاط الصفحة القرآنية", unit: "نقطة", min: 0, max: 100 },
      { key: "points_quran_wird_bonus", label: "مكافأة إتمام الورد (لكل صفحة)", unit: "نقطة", min: 0, max: 100 },
      { key: "points_morning_adhkar", label: "نقاط أذكار الصباح", unit: "نقطة", min: 0, max: 200 },
      { key: "points_evening_adhkar", label: "نقاط أذكار المساء", unit: "نقطة", min: 0, max: 200 },
      { key: "points_tasbeeh_33", label: "نقاط كل 33 تسبيحة", unit: "نقطة", min: 0, max: 200 },
    ],
  },
];

function EnginePage() {
  const [values, setValues] = useState<Record<string, number>>({ ...SETTINGS_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchAllSettings()
      .then((s) => setValues(s as Record<string, number>))
      .finally(() => setLoading(false));
  }, []);

  async function save(key: SettingsKey, value: number) {
    setSavingKey(key);
    try {
      await updateSetting(key, value);
      // Audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase.from("admin_audit_log" as any) as any).insert({
          admin_id: user.id,
          action: "setting.update",
          target_type: "global_settings",
          target_id: key,
          metadata: { new_value: value },
        });
      }
      toast.success("تم الحفظ والتطبيق فوراً");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحفظ");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">إعدادات المحرك</h2>
        <p className="text-sm text-muted-foreground">
          أي تعديل ينتشر فوراً إلى كل المستخدمين عبر الزمن الفعلي (Realtime).
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          هذه الإعدادات تتحكم في "دستور الحساب" للتطبيق (قاعدة 120/300 ثانية، قيم النقاط…). أي تغيير يطبّق على جميع المستخدمين دون الحاجة لإعادة نشر.
        </p>
      </div>

      {SECTIONS.map((sec) => {
        const Icon = sec.icon;
        return (
          <section key={sec.title} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-elegant)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon size={18} />
              </div>
              <h3 className="font-semibold">{sec.title}</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {sec.fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={f.min}
                      max={f.max}
                      value={values[f.key] ?? SETTINGS_DEFAULTS[f.key]}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))
                      }
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <span className="text-xs text-muted-foreground w-12 text-center">{f.unit}</span>
                    <button
                      onClick={() => {
                        const v = values[f.key];
                        if (v < f.min || v > f.max) {
                          toast.error(`القيمة يجب أن تكون بين ${f.min} و ${f.max}`);
                          return;
                        }
                        save(f.key, v);
                      }}
                      disabled={savingKey === f.key}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingKey === f.key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      حفظ
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    الافتراضي: <span className="tabular-nums">{SETTINGS_DEFAULTS[f.key]}</span> {f.unit}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
