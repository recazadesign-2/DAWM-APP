import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, BookOpen, Sun, Lock } from "lucide-react";
import { toast } from "sonner";
import { THEMES, useTheme, type ThemeMeta } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/themes")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — السمات" },
      { name: "description", content: "اختر السمة المفضلة لتطبيق دَاوِمْ مع معاينة فورية." },
    ],
  }),
  component: ThemesPage,
});

function ThemesPage() {
  const { theme, setTheme, meta } = useTheme();
  const { isGuest, user, isPremium } = useAuth();
  const canAccessPremium = !isGuest && !!user && isPremium;

  const handleSelect = (t: ThemeMeta) => {
    if (t.isPremium && !canAccessPremium) {
      toast("هذه السمة للمشتركين", {
        description: isGuest || !user
          ? "سجّل دخولك واشترك في النسخة المميزة لفتح كل السمات."
          : "اشترك في النسخة المميزة لفتح كل السمات.",
      });
      return;
    }
    setTheme(t.id);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground pb-12">
      <div className="max-w-[460px] mx-auto px-5 pt-6">
        <header className="flex items-center justify-between mb-6">
          <Link to="/profile" className="text-muted-foreground hover:text-foreground">
            <ArrowRight size={22} />
          </Link>
          <h1 className="text-lg font-bold font-display">السمات</h1>
          <div className="w-6" />
        </header>

        <PreviewCard meta={meta} live />

        <h2 className="mt-8 mb-3 text-sm text-muted-foreground text-right">اختر سمة</h2>

        <ul className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const active = t.id === theme;
            const locked = !!t.isPremium && !canAccessPremium;
            return (
              <li key={t.id}>
                <button
                  onClick={() => handleSelect(t)}
                  className={`relative w-full text-right rounded-2xl p-3 border-2 transition-all ${
                    active ? "border-primary" : "border-border hover:border-primary/40"
                  } ${locked ? "opacity-60" : ""}`}
                  style={{
                    background: t.bg,
                    color: t.text,
                    boxShadow: active ? "var(--shadow-glow)" : "var(--shadow-elegant)",
                  }}
                >
                  {locked && (
                    <span
                      className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: t.text + "22", color: t.text }}
                    >
                      <Lock size={10} /> مميز
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ background: t.primary }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: t.accent }} />
                      <span
                        className="w-3 h-3 rounded-full border"
                        style={{ background: t.surface, borderColor: t.text + "33" }}
                      />
                    </div>
                    {active && !locked && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: t.primary, color: t.bg }}
                      >
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-base font-display">{t.name}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{t.description}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

function PreviewCard({ meta, live }: { meta: ThemeMeta; live?: boolean }) {
  return (
    <div
      className="rounded-3xl p-5 border"
      style={{
        background: live ? "var(--card)" : meta.surface,
        color: live ? "var(--card-foreground)" : meta.text,
        borderColor: live ? "var(--border)" : meta.text + "22",
        boxShadow: "var(--shadow-elegant)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs opacity-70">معاينة لوحة التحكم</span>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: live ? "var(--primary)" : meta.primary, color: live ? "var(--primary-foreground)" : meta.bg }}
        >
          {meta.name}
        </span>
      </div>

      {/* Mini ring */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg width={80} height={80} className="-rotate-90">
            <circle cx={40} cy={40} r={34} stroke={live ? "var(--muted)" : meta.surface} strokeWidth={6} fill="none" />
            <circle
              cx={40}
              cy={40}
              r={34}
              stroke={live ? "var(--primary)" : meta.primary}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * 0.5}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">2/4</div>
        </div>
        <div className="flex-1 space-y-2">
          <div
            className="h-9 rounded-xl flex items-center justify-center text-xs font-bold gap-2"
            style={{
              background: live ? "transparent" : "transparent",
              border: `2px solid ${live ? "var(--primary)" : meta.primary}`,
              color: live ? "var(--primary)" : meta.primary,
            }}
          >
            <BookOpen size={14} /> ابدأ ورد اليوم
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-xl p-2 text-[10px] flex items-center gap-1"
              style={{
                background: live ? "var(--muted)" : meta.surface,
                color: live ? "var(--muted-foreground)" : meta.text,
              }}
            >
              <Sun size={12} /> أذكار
            </div>
            <div
              className="rounded-xl p-2 text-[10px] tabular-nums"
              style={{
                background: live ? "var(--muted)" : meta.surface,
                color: live ? "var(--primary)" : meta.primary,
              }}
            >
              01:10:00
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
