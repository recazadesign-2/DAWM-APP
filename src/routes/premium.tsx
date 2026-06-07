import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crown, Check } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — الباقات المميزة" },
      { name: "description", content: "اختر الخطة المناسبة لك من باقات دَاوِمْ." },
    ],
  }),
  component: PremiumPage,
});

const PLANS = [
  {
    title: "شهري",
    price: "29 ر.س",
    period: "/ شهر",
    features: ["كل المميزات", "إلغاء في أي وقت"],
    highlight: false,
  },
  {
    title: "سنوي",
    price: "199 ر.س",
    period: "/ سنة",
    features: ["خصم 45%", "كل المميزات", "أولوية الدعم"],
    highlight: true,
  },
  {
    title: "العائلة",
    price: "299 ر.س",
    period: "/ سنة",
    features: ["حتى 6 أفراد", "لوحة عائلية", "كل المميزات"],
    highlight: false,
  },
];

const FEATURES = [
  "تتبع متقدم وإحصاءات تفصيلية",
  "تذكيرات صلاة وأذكار ذكية",
  "حساب الورد بدقة + لوحة عائلية",
  "بدون إعلانات",
];

function PremiumPage() {
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

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary-foreground mb-3"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Crown size={22} />
        </div>
        <h2 className="text-xl font-bold mb-1">الباقات المميزة</h2>
        <p className="text-sm text-muted-foreground mb-5">
          ادعم تطوير التطبيق واحصل على مميزات إضافية لرحلتك.
        </p>

        <ul className="space-y-3 mb-6">
          {PLANS.map((p) => (
            <li
              key={p.title}
              className={`rounded-2xl p-4 border ${
                p.highlight ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-base font-bold">{p.title}</div>
                  <div className="text-2xl font-extrabold text-primary tabular-nums">
                    {p.price}
                    <span className="text-xs font-normal text-muted-foreground">
                      {p.period}
                    </span>
                  </div>
                </div>
                {p.highlight && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-primary text-primary-foreground font-bold">
                    الأكثر شعبية
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <Check size={14} className="text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="mt-4 w-full h-11 rounded-xl font-bold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                اشترك الآن
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-bold mb-2">كل الباقات تشمل</div>
          <ul className="space-y-1.5">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="text-xs text-muted-foreground flex items-center gap-2"
              >
                <Check size={14} className="text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
