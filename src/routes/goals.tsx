import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Heart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — اختر هدفك" },
      { name: "description", content: "اختر هدفك اليومي من القرآن والأذكار." },
    ],
  }),
  component: GoalsPage,
});

const GOALS = [
  {
    icon: BookOpen,
    title: "ورد القرآن",
    desc: "حدد عدد الصفحات اليومية للقراءة المنتظمة",
    to: "/goals/setup" as const,
  },
  {
    icon: Heart,
    title: "أذكار الصباح والمساء",
    desc: "التزم بأذكار اليوم والليلة",
    to: "/dhikr" as const,
  },
  {
    icon: Sparkles,
    title: "تسبيح يومي",
    desc: "ابدأ سبحتك الإلكترونية وادخل التحدي",
    to: "/dhikr" as const,
  },
];

function GoalsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="max-w-[460px] mx-auto px-5 pt-5 pb-10">
        <header className="grid grid-cols-3 items-center mb-5">
          <Link
            to="/"
            className="justify-self-start w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card"
            aria-label="رجوع"
          >
            <ArrowRight size={18} />
          </Link>
          <h1 className="font-logo text-2xl text-primary text-center">دَاوِمْ</h1>
          <span />
        </header>

        <h2 className="text-xl font-bold text-foreground mb-1">اختر هدفك</h2>
        <p className="text-sm text-muted-foreground mb-6">
          ابدأ رحلتك بهدف صغير تستطيع المداومة عليه.
        </p>

        <ul className="space-y-3">
          {GOALS.map(({ icon: Icon, title, desc, to }) => (
            <li key={title}>
              <Link
                to={to}
                className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-bold text-foreground">{title}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
