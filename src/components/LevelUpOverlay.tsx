import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Star } from "lucide-react";
import { levelService } from "@/services/levelService";
import { getLevelImage } from "@/assets/levels";

interface LevelUpDetail {
  level: number;
  oldLevel: number;
}

interface ConfettiPiece {
  id: number;
  left: number;       // %
  delay: number;      // s
  duration: number;   // s
  rotate: number;
  color: string;
  size: number;
}

const CONFETTI_PALETTE = ["#FFD700", "#50C878", "#9C27B0", "#CD7F32", "#FACC15", "#FFFFFF"];

export function LevelUpOverlay() {
  const [detail, setDetail] = useState<LevelUpDetail | null>(null);

  useEffect(() => {
    const onLevelUp = (e: Event) => {
      const d = (e as CustomEvent).detail as LevelUpDetail;
      setDetail(d);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([60, 40, 60, 40, 80]);
      }
    };
    window.addEventListener("level-up", onLevelUp);
    return () => window.removeEventListener("level-up", onLevelUp);
  }, []);

  const lvl = detail ? levelService.getLevels().find((l) => l.level === detail.level) : null;
  const color = lvl?.color ?? "#FFD700";

  const confetti = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.4 + Math.random() * 1.6,
      rotate: Math.random() * 540 - 270,
      color: CONFETTI_PALETTE[i % CONFETTI_PALETTE.length],
      size: 6 + Math.random() * 8,
    }));
  }, [detail?.level]);

  return (
    <AnimatePresence>
      {detail && lvl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 overflow-hidden"
          onClick={() => setDetail(null)}
          dir="rtl"
        >
          {/* Confetti rain */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {confetti.map((c) => (
              <motion.span
                key={c.id}
                initial={{ y: -40, x: 0, opacity: 0, rotate: 0 }}
                animate={{
                  y: "110vh",
                  opacity: [0, 1, 1, 0.8, 0],
                  rotate: c.rotate,
                }}
                transition={{
                  duration: c.duration,
                  delay: c.delay,
                  ease: "easeIn",
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }}
                className="absolute top-0 rounded-[2px]"
                style={{
                  left: `${c.left}%`,
                  width: c.size,
                  height: c.size * 0.4,
                  background: c.color,
                  boxShadow: `0 0 6px ${c.color}aa`,
                }}
              />
            ))}
          </div>

          <motion.div
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            initial={{ scale: 0.6, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 16, stiffness: 220 }}
            className="relative w-full max-w-sm rounded-[28px] border border-white/10 p-7 text-center"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,20,24,0.92), rgba(10,10,12,0.96))",
              boxShadow: `0 0 0 1px ${color}55, 0 30px 80px -20px ${color}aa, 0 0 60px ${color}55`,
            }}
          >
            {/* Halo glow */}
            <div
              aria-hidden
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none"
              style={{ background: color }}
            />

            {/* Crown badge */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
              className="relative mx-auto -mt-16 w-24 h-24 rounded-full flex items-center justify-center border-2"
              style={{
                borderColor: color,
                background: `radial-gradient(closest-side, ${color}55, ${color}11 70%, transparent)`,
                boxShadow: `0 0 36px ${color}cc, inset 0 0 22px ${color}66`,
                color,
              }}
            >
              <img
                src={getLevelImage(lvl.level)}
                alt={lvl.name}
                className="w-20 h-20 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              />
              <motion.span
                aria-hidden
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-10px] rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent, ${color}66, transparent 30%, transparent 70%, ${color}66, transparent)`,
                  WebkitMask:
                    "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-5"
            >
              <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.25em] text-white/60">
                <Sparkles size={12} style={{ color }} />
                ترقية مستوى
                <Sparkles size={12} style={{ color }} />
              </div>
              <h2
                className="font-display text-2xl font-bold mt-2 leading-snug"
                style={{ color }}
              >
                مبارك! لقد ارتقيت إلى مستوى
                <br />
                <span className="text-3xl">{lvl.name}</span>
              </h2>
              <p className="mt-3 text-sm text-white/65">
                بارك الله في عملك، استمر على الطاعة
              </p>

              <div className="mt-5 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.55 + i * 0.08, type: "spring" }}
                    style={{ color }}
                  >
                    <Star size={16} fill={color} strokeWidth={0} />
                  </motion.span>
                ))}
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={() => setDetail(null)}
              className="mt-6 w-full h-12 rounded-2xl font-bold text-black"
              style={{
                background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                boxShadow: `0 8px 24px -6px ${color}cc`,
              }}
            >
              مواصلة
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
