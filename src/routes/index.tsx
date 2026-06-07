import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, User, Sun, Moon, Clock, Sparkles } from "lucide-react";
import { getLevelImage } from "@/assets/levels";
import { WirdProgress } from "@/components/WirdProgress";
import { BottomTabBar } from "@/components/BottomTabBar";
import { LevelProgress } from "@/components/LevelProgress";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { GuestLockCard } from "@/components/GuestLockCard";
import { useEffect, useState } from "react";
import { useDynamicString } from "@/hooks/useDynamicString";
import { useDailyContent } from "@/hooks/useDailyContent";
import { useNextPrayer } from "@/hooks/useNextPrayer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — الرئيسية" },
      {
        name: "description",
        content: "لوحة التحكم اليومية: الورد، الصلاة، الأذكار، آية اليوم.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { state } = useApp();
  const { isGuest, user } = useAuth();
  const isLocked = isGuest || !user;
  const nextPrayer = useNextPrayer();
  const [isMorning, setIsMorning] = useState(true);
  useEffect(() => {
    setIsMorning(new Date().getHours() < 16);
  }, []);
  const appName = useDynamicString("home.app_name", "دَاوِمْ");
  const ayahLabel = useDynamicString("home.ayah_label", "آية اليوم");
  const dhikrMorning = useDynamicString("home.dhikr_morning", "أذكار الصباح");
  const dhikrEvening = useDynamicString("home.dhikr_evening", "أذكار المساء");
  const ayah = useDailyContent("ayah", { arabic_text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", reference: null, content_type: "ayah" });

  return (
    <main
      dir="rtl"
      className="relative min-h-screen text-foreground pb-32 overflow-hidden"
      style={{ background: "var(--gradient-bg, var(--background))" }}
    >
      <div className="relative max-w-[460px] mx-auto px-5 pt-5">
        {/* HEADER */}
        <header className="grid grid-cols-3 items-center mb-8">
          <div className="flex items-center gap-2 justify-self-start">
            {!isLocked && (
              <>
                <Link
                  to="/stats"
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card/60 overflow-hidden backdrop-blur dawm-press"
                  aria-label="المستوى الحالي"
                >
                  <img
                    src={getLevelImage(state.level)}
                    alt={`المستوى ${state.level}`}
                    className="w-8 h-8 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                  />
                </Link>
                <div
                  key={state.points}
                  className="dawm-points-pulse flex items-center gap-1.5 px-3 h-10 rounded-full border border-border bg-card/60 backdrop-blur"
                >
                  <Zap size={13} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {state.points}
                  </span>
                </div>
              </>
            )}
          </div>

          <h1
            className="text-3xl text-primary text-center tracking-wide select-none"
            style={{ fontFamily: '"XB Yas", "Plus Jakarta Sans", system-ui, sans-serif' }}
          >
            {appName}
          </h1>

          <Link
            to="/profile"
            className="justify-self-end w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card/60 text-foreground/80 backdrop-blur"
            aria-label="الحساب"
          >
            <User size={17} />
          </Link>
        </header>

        {/* CIRCULAR PROGRESS */}
        <section className="mt-2">
          {isLocked ? (
            <GuestLockCard
              title="تتبع الورد اليومي"
              description="القراءة متاحة الآن من الأذكار والقرآن. سجّل الدخول لتفعيل عداد الصفحات والسلسلة اليومية."
            />
          ) : (
            <WirdProgress />
          )}
        </section>

        {/* TWO MAIN CARDS */}
        <section className="mt-7 grid grid-cols-2 gap-3">
          <Link to="/dhikr">
            <Card
              icon={
                isMorning ? (
                  <Sun size={18} className="text-primary" />
                ) : (
                  <Moon size={18} className="text-primary" />
                )
              }
              title={isMorning ? dhikrMorning : dhikrEvening}
              subtitle="ابدأ الآن"
            />
          </Link>
          <Link to="/prayer">
            <Card
              icon={<Clock size={18} className="text-primary" />}
              title={`صلاة ${nextPrayer.name}`}
              subtitle={`${nextPrayer.time} · باقي ${nextPrayer.countdown}`}
            />
          </Link>
        </section>

        {/* DAILY COMPLETION RATE */}
        <DailyCompletionCard
          quranTarget={state.dailyWirdPages}
          quranPagesRead={state.wird.pagesRead}
          morningDone={state.dhikr.morningDone}
          eveningDone={state.dhikr.eveningDone}
        />

        {/* LEVEL PROGRESS */}
        {!isLocked && (
          <section className="mt-3">
            <LevelProgress points={state.points} />
          </section>
        )}

        {/* AYAH OF THE DAY */}
        <section
          className="mt-3 rounded-2xl p-5 border border-border bg-card"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <div className="flex items-center justify-end gap-1.5 mb-3">
            <span className="text-xs font-semibold text-primary">
              {ayahLabel}
            </span>
            <Sparkles size={13} className="text-primary" />
          </div>
          <p className="text-xl text-foreground leading-loose text-center font-quran">
            {ayah?.arabic_text}
          </p>
          {ayah?.reference && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">{ayah.reference}</p>
          )}
        </section>
      </div>

      <BottomTabBar />
    </main>
  );
}

function Card({
  icon,
  title,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 border border-border bg-card min-h-[105px] flex flex-col justify-between"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div className="flex justify-end">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-border"
          style={{
            background: accent
              ? "color-mix(in oklab, var(--accent) 12%, transparent)"
              : "color-mix(in oklab, var(--primary) 10%, transparent)",
          }}
        >
          {icon}
        </div>
      </div>
      <div className="text-right">
        <div className="text-base font-semibold text-foreground">{title}</div>
        {subtitle && (
          <div
            className={`text-xs mt-1 tabular-nums ${
              accent ? "text-accent" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

function DailyCompletionCard({
  quranTarget,
  quranPagesRead,
  morningDone,
  eveningDone,
}: {
  quranTarget: number;
  quranPagesRead: number;
  morningDone: boolean;
  eveningDone: boolean;
}) {
  const totalTasks = 2 + (quranTarget > 0 ? 1 : 0);
  const quranPct =
    quranTarget > 0 ? Math.min(1, quranPagesRead / quranTarget) : 0;
  const completedUnits =
    quranPct + (morningDone ? 1 : 0) + (eveningDone ? 1 : 0);
  const pct =
    totalTasks > 0 ? Math.round((completedUnits / totalTasks) * 100) : 0;
  const full = pct >= 100;

  return (
    <Link
      to="/family"
      className="block mt-3 dawm-press"
      aria-label="معدل الإنجاز اليومي — انتقل إلى المجموعات"
    >
      <section
        className="rounded-2xl p-4 border border-border bg-card relative overflow-hidden"
        style={{ boxShadow: "var(--shadow-elegant)" }}
      >
        <div
          aria-hidden
          className="absolute -top-12 -left-10 w-40 h-40 rounded-full blur-3xl opacity-25"
          style={{ background: "var(--primary)" }}
        />
        <div className="relative flex items-center justify-between mb-3">
          <div className="text-right">
            <h3 className="text-sm font-semibold text-foreground">
              معدل الإنجاز اليومي
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ورد القرآن وأذكار الصباح والمساء
            </p>
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              full ? "text-accent" : "text-primary"
            }`}
            dir="ltr"
          >
            {pct}%
          </div>
        </div>
        <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden">
          <div
            className="absolute inset-y-0 right-0 rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--primary), var(--accent))",
              boxShadow:
                "0 0 18px color-mix(in oklab, var(--primary) 35%, transparent)",
            }}
          />
        </div>
        <div className="relative flex items-center justify-between mt-3 text-[11px] text-muted-foreground">
          <span>
            القرآن {Math.min(quranPagesRead, quranTarget)}/{quranTarget}
          </span>
          <span className={morningDone ? "text-accent font-bold" : ""}>
            الصباح {morningDone ? "✓" : "—"}
          </span>
          <span className={eveningDone ? "text-accent font-bold" : ""}>
            المساء {eveningDone ? "✓" : "—"}
          </span>
        </div>
      </section>
    </Link>
  );
}
