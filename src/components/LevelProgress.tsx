import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Sparkles } from "lucide-react";
import { levelService } from "@/services/levelService";
import { getLevelImage } from "@/assets/levels";

/** Hook: smoothly counts from previous value to target. */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      // easeOutCubic
      const e = 1 - Math.pow(1 - k, 3);
      setVal(Math.round(from + (target - from) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function LevelProgress({ points }: { points: number }) {
  const info = levelService.getCurrentLevel(points);
  const { current, next, percentage, pointsToNext } = info;
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const animatedPoints = useCountUp(points);
  const color = current.color;

  return (
    <div
      ref={ref}
      dir="rtl"
      className="relative rounded-3xl p-5 border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden"
      style={{
        boxShadow: `0 18px 48px -28px ${color}cc, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* color wash */}
      <div
        aria-hidden
        className="absolute -top-20 -left-16 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: color }}
      />
      <Sparkles
        size={120}
        className="absolute -right-4 -bottom-6 opacity-[0.07] pointer-events-none"
        style={{ color }}
      />

      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-[11px] tracking-[0.18em] text-white/55">
            المستوى الحالي
          </div>
          <h3 className="font-display text-xl font-bold mt-1" style={{ color }}>
            {current.name}
          </h3>
          <div className="text-[11px] text-white/45 mt-0.5">
            المستوى {current.level} من {6}
          </div>
        </div>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: `radial-gradient(closest-side, ${color}33, transparent)`,
            boxShadow: `0 0 22px ${color}55`,
          }}
        >
          <img
            src={getLevelImage(current.level)}
            alt={current.name}
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* points (counting) */}
      <div className="mt-4 flex items-baseline gap-1.5" dir="ltr">
        <span
          className="font-display text-4xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {animatedPoints.toLocaleString("ar-EG")}
        </span>
        <span className="text-sm text-white/55">XP</span>
      </div>

      {/* progress bar */}
      <div className="mt-4 h-3 rounded-full bg-white/[0.06] overflow-hidden border border-white/5 relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: inView ? `${percentage}%` : 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${color}, ${lighten(color)} )`,
            boxShadow: `0 0 12px ${color}cc, 0 0 24px ${color}66`,
          }}
        >
          {/* shimmer */}
          <motion.span
            aria-hidden
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear", delay: 1 }}
            className="absolute inset-y-0 w-1/3 block"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
            }}
          />
        </motion.div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <span className="text-white/55 tabular-nums" dir="ltr">
          {points} / {next?.threshold ?? current.threshold}
        </span>
        {next ? (
          <span className="font-semibold" style={{ color }}>
            {pointsToNext.toLocaleString("ar-EG")} نقطة للوصول إلى {next.name}
          </span>
        ) : (
          <span className="font-semibold" style={{ color }}>
            بلغت أعلى مستوى ✨
          </span>
        )}
      </div>
    </div>
  );
}

/** Lighten a hex color by mixing with white in HSL-ish way (quick and dirty). */
function lighten(hex: string) {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.35);
  const hx = (c: number) => c.toString(16).padStart(2, "0");
  return `#${hx(mix(r))}${hx(mix(g))}${hx(mix(b))}`;
}
