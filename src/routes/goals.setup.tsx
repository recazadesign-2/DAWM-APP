import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/goals/setup")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — ضبط الورد" },
      { name: "description", content: "اختر عدد صفحات وردك اليومي." },
    ],
  }),
  component: GoalSetupPage,
});

const PRESETS = [
  { pages: 2, label: "خفيف", desc: "صفحتان يومياً — البداية" },
  { pages: 4, label: "ربع جزء", desc: "أربع صفحات — متزن" },
  { pages: 8, label: "نصف جزء", desc: "ثماني صفحات — جاد" },
  { pages: 20, label: "جزء كامل", desc: "ختمة شهرياً" },
];

function GoalSetupPage() {
  const { state, setDailyGoal } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(state.dailyWirdPages);

  const save = () => {
    setDailyGoal(selected);
    navigate({ to: "/" });
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="max-w-[460px] mx-auto px-5 pt-5 pb-10">
        <header className="grid grid-cols-3 items-center mb-5">
          <Link
            to="/goals"
            className="justify-self-start w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card"
            aria-label="رجوع"
          >
            <ArrowRight size={18} />
          </Link>
          <h1 className="font-logo text-2xl text-primary text-center">دَاوِمْ</h1>
          <span />
        </header>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary-foreground mb-3"
          style={{ background: "var(--gradient-primary)" }}
        >
          <BookOpen size={22} />
        </div>
        <h2 className="text-xl font-bold mb-1">حدد وردك اليومي</h2>
        <p className="text-sm text-muted-foreground mb-5">
          اختر عدد الصفحات التي تلتزم بقراءتها كل يوم، ودَاوِمْ سيعينك على المتابعة.
        </p>

        <ul className="space-y-3">
          {PRESETS.map((p) => {
            const active = selected === p.pages;
            return (
              <li key={p.pages}>
                <button
                  type="button"
                  onClick={() => setSelected(p.pages)}
                  className={`w-full text-right flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold tabular-nums ${
                      active
                        ? "text-primary-foreground"
                        : "text-foreground bg-muted"
                    }`}
                    style={
                      active
                        ? { background: "var(--gradient-primary)" }
                        : undefined
                    }
                  >
                    {p.pages}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-foreground">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                  {active && <Check className="text-primary" size={18} />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 rounded-2xl p-4 border border-border bg-card">
          <label className="block text-xs text-muted-foreground mb-2">
            أو حدد عدداً مخصصاً
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={selected}
            onChange={(e) => setSelected(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-foreground text-center font-bold tabular-nums"
          />
        </div>

        <button
          onClick={save}
          className="mt-6 w-full h-12 rounded-2xl text-primary-foreground font-bold"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          حفظ الهدف
        </button>
      </div>
    </main>
  );
}
