import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Sun, Moon, BedDouble, Sunrise, Sparkles, HandHeart, BookOpen, ChevronLeft, CircleDot, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useApp } from "@/contexts/AppContext";
import { ADHKAR_CATEGORIES, getCategory, type DhikrCategory } from "@/data/adhkar";

export const Route = createFileRoute("/dhikr")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — الأذكار" },
      { name: "description", content: "أذكار الصباح والمساء والنوم والاستيقاظ وبعد الصلاة وأدعية من القرآن والسنة." },
    ],
  }),
  component: DhikrPage,
});

const ICONS = {
  sun: Sun,
  moon: Moon,
  bed: BedDouble,
  sunrise: Sunrise,
  prayer: Sparkles,
  dua: HandHeart,
  tasbih: CircleDot,
} as const;

function DhikrPage() {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Auto-suggest morning/evening on first open based on time
  useEffect(() => {
    if (activeId === null) return;
  }, [activeId]);

  if (!activeId) {
    return <CategoryIndex onPick={setActiveId} />;
  }

  const cat = getCategory(activeId);
  if (!cat) {
    setActiveId(null);
    return null;
  }

  return <CategoryReader category={cat} onBack={() => setActiveId(null)} />;
}

function CategoryIndex({ onPick }: { onPick: (id: string) => void }) {
  const suggested = useMemo(() => {
    const h = new Date().getHours();
    return h < 16 ? "morning" : h < 21 ? "evening" : "sleep";
  }, []);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen text-foreground pb-32 overflow-hidden"
      style={{ background: "var(--gradient-bg, var(--background))" }}
    >
      <div className="relative max-w-[460px] mx-auto px-5 pt-5">
        <header className="grid grid-cols-3 items-center mb-6">
          <Link
            to="/"
            className="justify-self-start w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card/60 text-foreground/80 backdrop-blur"
            aria-label="رجوع"
          >
            <ArrowRight size={18} />
          </Link>
          <h1 className="font-logo text-2xl text-primary text-center tracking-wide">
            دَاوِمْ
          </h1>
          <span className="justify-self-end w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card/60 backdrop-blur text-primary">
            <BookOpen size={18} />
          </span>
        </header>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">حصن المسلم</h2>
          <p className="text-sm text-muted-foreground">
            أذكار وأدعية من القرآن والسنة الصحيحة
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {ADHKAR_CATEGORIES.map((cat, i) => {
            const Icon = ICONS[cat.icon];
            const isSuggested = cat.id === suggested;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => onPick(cat.id)}
                className="group relative flex items-center gap-4 p-4 rounded-2xl border border-border bg-card text-right active:scale-[0.98] transition-transform"
                style={{ boxShadow: "var(--shadow-elegant)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground shrink-0"
                  style={{
                    background: "var(--gradient-primary)",
                    boxShadow: "var(--shadow-glow)",
                  }}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{cat.title}</h3>
                    {isSuggested && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "color-mix(in oklab, var(--accent) 20%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        مقترح الآن
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cat.subtitle} · {cat.items.length} ذكر
                  </p>
                </div>
                <ChevronLeft size={18} className="text-muted-foreground" />
              </motion.button>
            );
          })}
        </div>

        <p className="text-[11px] text-center text-muted-foreground mt-6 leading-relaxed">
          المصادر: القرآن الكريم، صحيح البخاري، صحيح مسلم، سنن أبي داود،<br />
          الترمذي، النسائي، ابن ماجه، مسند أحمد.
        </p>
      </div>

      <BottomTabBar />
    </main>
  );
}

function CategoryReader({ category, onBack }: { category: DhikrCategory; onBack: () => void }) {
  const navigate = useNavigate();
  const { completeMorningDhikr, completeEveningDhikr } = useApp();
  const list = category.items;
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(list[0].count);
  const [tasbihCount, setTasbihCount] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const total = list.length;
  const current = list[idx];
  const isInfinite = !!current.infinite;
  const overallProgress = isInfinite
    ? (idx + 1) / total
    : (idx + (1 - remaining / Math.max(1, list[idx].count))) / total;
  const Icon = ICONS[category.icon];

  const goTo = (newIdx: number, dir: 1 | -1) => {
    setDirection(dir);
    setIdx(newIdx);
    setRemaining(list[newIdx].count);
    setTasbihCount(0);
  };

  const next = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
    if (isInfinite) {
      setTasbihCount((c) => c + 1);
      return;
    }
    if (remaining > 1) {
      setRemaining(remaining - 1);
      return;
    }
    if (idx + 1 < total) {
      setRemaining(0);
      setTimeout(() => goTo(idx + 1, 1), 250);
    } else {
      if (category.id === "morning") completeMorningDhikr();
      else if (category.id === "evening") completeEveningDhikr();
      setTimeout(() => {
        navigate({ to: "/completion", search: { from: "dhikr" } as never });
      }, 250);
    }
  };

  const prev = () => {
    if (idx === 0) return;
    goTo(idx - 1, -1);
  };


  return (
    <main
      dir="rtl"
      className="relative min-h-screen text-foreground pb-32 overflow-hidden"
      style={{ background: "var(--gradient-bg, var(--background))" }}
    >
      <div className="relative max-w-[460px] mx-auto px-5 pt-5">
        <header className="grid grid-cols-3 items-center mb-3">
          <button
            onClick={onBack}
            className="justify-self-start w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card/60 text-foreground/80 backdrop-blur"
            aria-label="رجوع للأقسام"
          >
            <ArrowRight size={18} />
          </button>
          <div className="flex items-center justify-center gap-2">
            <Icon size={16} className="text-primary" />
            <h1 className="text-base font-bold text-foreground text-center">
              {category.title}
            </h1>
          </div>
          <div
            className="justify-self-end px-3 h-10 rounded-full border border-border bg-card/60 backdrop-blur flex items-center text-sm font-semibold tabular-nums text-foreground/80"
            dir="ltr"
          >
            {idx + 1} / {total}
          </div>
        </header>

        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(100, overallProgress * 100)}%`,
              background: "var(--gradient-primary)",
            }}
          />
        </div>

        <div className="mt-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${category.id}-${idx}`}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full rounded-3xl p-6 border border-border bg-card"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              {current.label && (
                <div className="text-center text-xs text-primary font-semibold mb-3 tracking-wide">
                  {current.label}
                </div>
              )}
              <p
                className="font-quran text-foreground text-center leading-loose"
                style={{ fontSize: "21px" }}
              >
                {current.text}
              </p>

              {current.virtue && (
                <div
                  className="mt-4 p-3 rounded-xl text-xs leading-relaxed text-center"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 10%, transparent)",
                    color: "var(--foreground)",
                  }}
                >
                  ✦ {current.virtue}
                </div>
              )}

              {current.reference && (
                <div className="mt-3 text-[11px] text-center text-muted-foreground">
                  {current.reference}
                </div>
              )}

              <div className="mt-6 flex flex-col items-center">
                <button
                  onClick={next}
                  className="relative w-40 h-40 rounded-full flex items-center justify-center text-primary-foreground text-5xl font-semibold tabular-nums active:scale-95 transition-transform"
                  style={{
                    background: "var(--gradient-primary)",
                    boxShadow: "var(--shadow-glow)",
                  }}
                  aria-label="عداد الذكر"
                >
                  {isInfinite ? tasbihCount : remaining}
                </button>
                <p className="mt-3 text-xs text-muted-foreground">
                  {isInfinite ? "اضغط للتسبيح · بلا حد" : `اضغط للتسبيح · من أصل ${current.count}`}
                </p>
                {isInfinite && (
                  <button
                    onClick={() => setTasbihCount(0)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-foreground/70 border border-border bg-card/60 backdrop-blur active:scale-95 transition"
                  >
                    <RotateCcw size={12} /> تصفير
                  </button>
                )}
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-4 gap-2">
          <button
            onClick={prev}
            disabled={idx === 0}
            className="flex-1 py-3 rounded-xl border border-border bg-card/60 backdrop-blur text-sm font-semibold text-foreground/80 disabled:opacity-40"
          >
            السابق
          </button>
          <button
            onClick={() => {
              if (idx + 1 < total) goTo(idx + 1, 1);
            }}
            disabled={idx + 1 >= total}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-primary-foreground disabled:opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          >
            التالي
          </button>

        </div>
      </div>

      <BottomTabBar />
    </main>
  );
}
