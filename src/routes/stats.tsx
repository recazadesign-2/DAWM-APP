import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  Coins,
  Flame,
  Lock,
  Moon,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useApp, LEVEL_NAMES } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { GuestLockCard } from "@/components/GuestLockCard";
import { useLevels } from "@/hooks/useLevels";
import { badgesService, type BadgeState } from "@/services/badgesService";
import { statsService } from "@/services/statsService";
import { getLevelImage } from "@/assets/levels";
import dawmLogoMark from "@/assets/dawm-logo-mark.png";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — الإحصائيات" },
      { name: "description", content: "إحصائيات التزامك الأسبوعي والإنجازات." },
    ],
  }),
  component: StatsPage,
});

const WEEK = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

function StatsPage() {
  const { state } = useApp();
  const { isGuest, user } = useAuth();

  if (isGuest || !user) {
    return (
      <main
        dir="rtl"
        className="min-h-screen pb-28 bg-background text-foreground"
      >
        <div className="max-w-[460px] mx-auto px-5 pt-6">
          <Header />
          <GuestLockCard
            title="الإحصائيات والإنجازات"
            description="سجّل الدخول لمتابعة سلسلة التزامك اليومي، عدد الصفحات المقروءة، ونقاطك ومستواك."
          />
        </div>
        <BottomTabBar />
      </main>
    );
  }

  const { points, level: cur, nextLevel: nxt, percentage: pct, pointsToNext } = useLevels();

  const badges = useMemo<BadgeState[]>(
    () =>
      badgesService.evaluate(
        badgesService.buildSnapshot({
          points,
          streak: state.streak,
          morningDoneToday: state.dhikr.morningDone,
          eveningDoneToday: state.dhikr.eveningDone,
        }),
      ),
    [points, state.streak, state.dhikr.morningDone, state.dhikr.eveningDone, state.lastReadPage],
  );
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const [agg, setAgg] = useState(() => ({
    streak: statsService.computeStreak(),
    totalPages: statsService.computeTotalPages(),
    week: statsService.computeWeekData(),
    heatmap: statsService.computeHeatmap(),
  }));
  useEffect(() => {
    const recompute = () =>
      setAgg({
        streak: statsService.computeStreak(),
        totalPages: statsService.computeTotalPages(),
        week: statsService.computeWeekData(),
        heatmap: statsService.computeHeatmap(),
      });
    recompute();
    window.addEventListener("progress-changed", recompute);
    window.addEventListener("points-changed", recompute);
    return () => {
      window.removeEventListener("progress-changed", recompute);
      window.removeEventListener("points-changed", recompute);
    };
  }, []);

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-28 bg-background text-foreground relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(120% 60% at 50% -10%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%)",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 40%, transparent), transparent)",
        }}
      />

      <div className="max-w-[460px] mx-auto px-5 pt-6 relative">
        <Header />

        {/* Hero — level & points */}
        <Reveal delay={0.05}>
          <section className="relative rounded-[24px] p-5 overflow-hidden border border-border bg-card/60 backdrop-blur-xl">
            <img
              src={dawmLogoMark}
              alt=""
              aria-hidden
              className="absolute -left-6 -bottom-8 w-36 h-36 opacity-[0.10] pointer-events-none select-none"
            />
            <Sparkles
              size={64}
              className="absolute right-3 top-3 opacity-[0.12] text-primary"
            />

            <div className="flex items-start justify-between relative">
              <div>
                <div className="text-[11px] tracking-[0.18em] text-muted-foreground">
                  المستوى الحالي
                </div>
                <h2 className="font-display text-2xl font-bold mt-1">
                  {LEVEL_NAMES[cur.level - 1] ?? cur.name}
                </h2>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center border border-primary/40 overflow-hidden"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 25%, transparent), transparent)",
                  boxShadow:
                    "0 0 24px color-mix(in oklab, var(--primary) 40%, transparent)",
                }}
              >
                <img
                  src={getLevelImage(cur.level)}
                  alt={`المستوى ${cur.level}`}
                  className="w-11 h-11 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
                />
              </div>
            </div>

            {/* glowing progress bar */}
            <div className="mt-5">
              <div className="h-3 rounded-full bg-muted overflow-hidden border border-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: "var(--gradient-primary)",
                    boxShadow:
                      "0 0 14px color-mix(in oklab, var(--primary) 60%, transparent), 0 0 28px color-mix(in oklab, var(--primary) 40%, transparent)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[12px]">
                <span className="text-muted-foreground tabular-nums">
                  {points} / {nxt?.threshold ?? cur.threshold} نقطة
                </span>
                <span className="font-semibold tabular-nums text-primary">
                  {Math.round(pct)}%
                </span>
              </div>
              {nxt ? (
                <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                  أنت على بُعد{" "}
                  <span className="font-bold tabular-nums text-primary">
                    {pointsToNext}
                  </span>{" "}
                  نقطة من المستوى القادم{" "}
                  <span className="text-foreground font-semibold">{nxt.name}</span>
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  لقد بلغت أعلى مستوى — بارك الله فيك
                </p>
              )}
            </div>
          </section>
        </Reveal>

        {/* Quick stats bento grid */}
        <Reveal delay={0.12}>
          <section className="mt-4 grid grid-cols-3 gap-3">
            <BentoStat
              icon={<Flame size={18} />}
              label="أيام الاستمرار"
              value={agg.streak.toString()}
              tone="warm"
            />
            <BentoStat
              icon={<Coins size={18} />}
              label="إجمالي النقاط"
              value={points.toString()}
              tone="primary"
            />
            <BentoStat
              icon={<BookOpen size={18} />}
              label="صفحات القرآن"
              value={agg.totalPages.toString()}
              tone="accent"
            />
          </section>
        </Reveal>

        {/* Heatmap */}
        <Reveal delay={0.18}>
          <Card title="خريطة التفاعل" hint="آخر ١٢ أسبوع">
            <Heatmap cells={agg.heatmap} />
          </Card>
        </Reveal>

        {/* Weekly bar chart */}
        <Reveal delay={0.24}>
          <Card title="الأداء الأسبوعي" hint="صفحات / يوم">
            <WeeklyChart data={agg.week} goal={state.dailyWirdPages} />
          </Card>
        </Reveal>

        {/* Badges */}
        <Reveal delay={0.30}>
          <section className="mt-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-display text-base font-bold">الأوسمة والإنجازات</h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {unlockedCount} / {badges.length} مفتوحة
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
              {badges.map((b) => (
                <Badge
                  key={b.id}
                  unlocked={b.unlocked}
                  icon={iconForBadge(b.id)}
                  label={b.label}
                  earnedAt={b.earnedAt}
                />
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      <BottomTabBar />
    </main>
  );
}

function Header() {
  return (
    <header className="grid grid-cols-3 items-center mb-6">
      <Link
        to="/"
        aria-label="رجوع"
        className="justify-self-start w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card/60 text-muted-foreground hover:text-foreground"
      >
        <ArrowRight size={18} />
      </Link>
      <h1 className="font-display text-lg font-bold text-center tracking-wide">
        الإحصائيات
      </h1>
      <span />
    </header>
  );
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-[24px] p-5 border border-border bg-card/60 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function BentoStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "warm" | "primary" | "accent";
}) {
  const ringVar =
    tone === "warm"
      ? "var(--destructive)"
      : tone === "primary"
        ? "var(--primary)"
        : "var(--accent)";

  return (
    <div
      className="rounded-[24px] p-4 border border-border bg-card/60 backdrop-blur-xl text-right relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute -top-8 -left-8 w-24 h-24 rounded-full blur-2xl opacity-40"
        style={{
          background: `color-mix(in oklab, ${ringVar} 35%, transparent)`,
        }}
      />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center border"
        style={{
          color: ringVar,
          borderColor: `color-mix(in oklab, ${ringVar} 40%, transparent)`,
          background: `color-mix(in oklab, ${ringVar} 12%, transparent)`,
        }}
      >
        {icon}
      </div>
      <div className="mt-3 font-display text-3xl font-bold tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function Heatmap({ cells }: { cells: number[] }) {
  const colorFor = (lvl: number) => {
    if (lvl === 0) return "color-mix(in oklab, var(--foreground) 6%, transparent)";
    const opacities = [0, 25, 45, 70, 100];
    return `color-mix(in oklab, var(--primary) ${opacities[lvl]}%, transparent)`;
  };
  const shadowFor = (lvl: number) =>
    lvl >= 3
      ? `0 0 6px color-mix(in oklab, var(--primary) ${lvl === 4 ? 60 : 40}%, transparent)`
      : "none";

  return (
    <div className="overflow-x-auto -mx-1 pb-1">
      <div
        className="grid grid-rows-7 grid-flow-col gap-1.5 px-1"
        style={{ direction: "ltr" }}
      >
        {cells.map((lvl, i) => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-[4px] transition-colors"
            style={{ background: colorFor(lvl), boxShadow: shadowFor(lvl) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
        <span>أقل</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className="w-3 h-3 rounded-[4px]"
            style={{ background: colorFor(l), boxShadow: shadowFor(l) }}
          />
        ))}
        <span>أكثر</span>
      </div>
    </div>
  );
}

function WeeklyChart({ data, goal }: { data: number[]; goal: number }) {
  const max = Math.max(...data, goal, 1);
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {data.map((v, i) => {
        const complete = v >= goal;
        const h = Math.max(6, (v / max) * 100);
        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <div className="flex-1 w-full flex items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                className="w-full rounded-t-xl"
                style={{
                  background: complete
                    ? "var(--gradient-primary)"
                    : "color-mix(in oklab, var(--foreground) 8%, transparent)",
                  boxShadow: complete
                    ? "0 0 14px color-mix(in oklab, var(--primary) 50%, transparent), inset 0 0 0 1px color-mix(in oklab, var(--primary) 40%, transparent)"
                    : "inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent)",
                }}
              />
            </div>
            <span
              className={`text-[10px] ${complete ? "text-foreground" : "text-muted-foreground"}`}
            >
              {WEEK[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Badge({
  icon,
  label,
  unlocked = false,
  earnedAt = null,
}: {
  icon: React.ReactNode;
  label: string;
  unlocked?: boolean;
  earnedAt?: string | null;
}) {
  return (
    <div className="snap-start shrink-0 w-[88px] flex flex-col items-center text-center">
      <div
        className={`w-[72px] h-[72px] rounded-[22px] flex items-center justify-center border relative ${unlocked ? "" : "grayscale"}`}
        style={
          unlocked
            ? {
                borderColor: "color-mix(in oklab, var(--primary) 40%, transparent)",
                background:
                  "linear-gradient(160deg, color-mix(in oklab, var(--primary) 18%, transparent), color-mix(in oklab, var(--accent) 14%, transparent))",
                boxShadow:
                  "0 0 18px color-mix(in oklab, var(--primary) 40%, transparent), inset 0 0 0 1px color-mix(in oklab, var(--primary) 35%, transparent)",
                color: "var(--primary)",
              }
            : {
                borderColor: "var(--border)",
                background: "color-mix(in oklab, var(--foreground) 4%, transparent)",
                color: "color-mix(in oklab, var(--foreground) 40%, transparent)",
              }
        }
      >
        {icon}
        {!unlocked && (
          <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-background/80 border border-border flex items-center justify-center">
            <Lock size={11} className="text-muted-foreground" />
          </div>
        )}
      </div>
      <div
        className={`mt-2 text-[11px] leading-tight ${unlocked ? "text-foreground/85" : "text-muted-foreground"}`}
      >
        {label}
      </div>
      {unlocked && earnedAt && (
        <div className="mt-0.5 text-[9px] text-muted-foreground tabular-nums">
          {formatEarnedDate(earnedAt)}
        </div>
      )}
    </div>
  );
}

function formatEarnedDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      day: "2-digit",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function iconForBadge(id: import("@/services/badgesService").BadgeId): React.ReactNode {
  switch (id) {
    case "fajr_reader":     return <Sunrise size={22} />;
    case "perfect_khatma":  return <BookOpen size={22} />;
    case "night_riser":     return <Moon size={22} />;
    case "streak_30":       return <Flame size={22} />;
    case "thousand_points": return <Star size={22} />;
    case "surah_keeper":    return <Award size={22} />;
    default:                return <Award size={22} />;
  }
}
