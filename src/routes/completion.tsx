import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Home } from "lucide-react";
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { z } from "zod";
import { useApp } from "@/contexts/AppContext";
import { trackEvent } from "@/services/analyticsService";

const searchSchema = z.object({
  from: z.enum(["wird", "dhikr"]).optional(),
});

export const Route = createFileRoute("/completion")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — أتممت" },
      { name: "description", content: "تقبل الله طاعتك." },
    ],
  }),
  validateSearch: searchSchema,
  component: CompletionPage,
});

function CompletionPage() {
  const { state } = useApp();
  const { from } = Route.useSearch();
  const isDhikr = from === "dhikr";

  useEffect(() => {
    trackEvent(isDhikr ? "dhikr_completed" : "wird_completed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // generate confetti pieces once
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        color: i % 3 === 0 ? "var(--accent)" : "var(--primary)",
      })),
    [],
  );

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
  }, []);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen text-foreground flex items-center justify-center px-5 overflow-hidden"
      style={{ background: "var(--gradient-bg, var(--background))" }}
    >
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            initial={{ y: -40, opacity: 0, rotate: 0 }}
            animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: p.rotate }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "easeIn",
            }}
            className="absolute top-0 block w-2 h-3 rounded-sm"
            style={{ left: `${p.left}%`, background: p.color }}
          />
        ))}
      </div>

      <div className="relative max-w-[420px] w-full text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Sparkles size={44} className="text-primary-foreground" />
        </motion.div>

        <h1 className="text-3xl font-bold font-display mb-2">
          {isDhikr ? "تقبل الله طاعتك ✨" : "أتممت وردك ✨"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isDhikr
            ? "أحسنت! لقد أكملت الأذكار. حافظ على هذه العادة المباركة."
            : "تقبّل الله منك. حافظ على عادتك وستحصد الثمار بإذن الله."}
        </p>

        <div
          className="rounded-2xl p-5 border border-border bg-card grid grid-cols-3 gap-3 mb-8"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <Stat
            label={isDhikr ? "الأذكار" : "الصفحات"}
            value={
              isDhikr ? "✓" : state.dailyWirdPages.toString()
            }
          />
          <Stat label="النقاط" value={isDhikr ? "+50" : "+50"} />
          <Stat label="السلسلة" value={(state.streak + 1).toString()} />
        </div>

        <Link
          to="/"
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-primary-foreground font-bold"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Home size={18} /> الرجوع للرئيسية
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-primary tabular-nums font-display">
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
