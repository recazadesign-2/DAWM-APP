import { BookOpen, Check, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type ThemeId } from "@/contexts/ThemeContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wirdSettingsService, WIRD_LOCK_MS } from "@/services/wirdSettingsService";

type RingPalette = { a: string; b: string; c: string; d: string; e: string; dot1: string; dot2: string; dot3: string };

const RING_PALETTES: Record<ThemeId, RingPalette> = {
  night:   { a: "#7a5a1f", b: "#e6c060", c: "#fff0b8", d: "#d4a23a", e: "#6b4a18", dot1: "#fff8d8", dot2: "#f0c861", dot3: "#8a6418" },
  ramadan: { a: "#7a5a1f", b: "#e6c060", c: "#fff0b8", d: "#d4a23a", e: "#6b4a18", dot1: "#fff8d8", dot2: "#f0c861", dot3: "#8a6418" },
  friday:  { a: "#7a5a1f", b: "#e6c060", c: "#fff0b8", d: "#d4a23a", e: "#6b4a18", dot1: "#fff8d8", dot2: "#f0c861", dot3: "#8a6418" },
  talia:   { a: "#5a1130", b: "#a8265b", c: "#f0a8c4", d: "#87223f", e: "#3a0a1f", dot1: "#fde4ec", dot2: "#d6336c", dot3: "#5a1130" },
  paper:   { a: "#3d2412", b: "#7a4a22", c: "#c89060", d: "#5a3318", e: "#2a180a", dot1: "#e8c79a", dot2: "#8b5e34", dot3: "#3d2412" },
  day:     { a: "#0b3a24", b: "#1f6f44", c: "#5cc28a", d: "#155a32", e: "#06281a", dot1: "#bfe9cf", dot2: "#1f9d6b", dot3: "#0b3a24" },
};

const STEPS = 10;
const MIN = 1;
const MAX = 10;
const DEG_PER_STEP = 360 / STEPS; // 36°

// ─── Web-Audio mechanical click ──────────────────────────────
function useClickSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) ctxRef.current = new Ctx();
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };
  return useCallback(() => {
    const ctx = ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    // short metallic tick: high osc + noise burst through a band-pass
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(2200, t);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t);
    oscGain.gain.exponentialRampToValueAtTime(0.18, t + 0.001);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);

    // noise burst
    const buf = ctx.createBuffer(1, 256, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 5200;
    bp.Q.value = 8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.25, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    noise.connect(bp).connect(ng).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.06);
  }, []);
}

export function WirdProgress() {
  const navigate = useNavigate();
  const { state, startWird, setDailyGoal } = useApp();
  const { user } = useAuth();
  const { theme } = useTheme();
  const palette = RING_PALETTES[theme] ?? RING_PALETTES.night;

  const saved = state.dailyWirdPages;
  const [value, setValue] = useState<number>(saved);
  const [angle, setAngle] = useState<number>(0); // visual ring rotation
  const [lockUntil, setLockUntil] = useState<number>(0);
  const lastAngleRef = useRef<number>(0);
  const accumRef = useRef<number>(0); // accumulated delta since last tick
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const click = useClickSound();

  // sync if external save changes
  useEffect(() => {
    setValue(saved);
  }, [saved]);

  // hydrate goal + lock per-user from the cloud (falls back to local cache)
  useEffect(() => {
    let cancelled = false;
    wirdSettingsService.load().then((s) => {
      if (cancelled) return;
      if (s.dailyGoal && s.dailyGoal !== saved) {
        setDailyGoal(s.dailyGoal);
        setValue(s.dailyGoal);
      }
      setLockUntil(s.lockedUntil > Date.now() ? s.lockedUntil : 0);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const locked = lockUntil > Date.now();
  const daysLeft = locked ? Math.ceil((lockUntil - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;

  const tickAngles = useMemo(
    () => Array.from({ length: STEPS }, (_, i) => i * DEG_PER_STEP),
    [],
  );

  const getAngle = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    lastAngleRef.current = getAngle(e.clientX, e.clientY);
    accumRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const a = getAngle(e.clientX, e.clientY);
    let delta = a - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngleRef.current = a;

    setAngle((p) => p + delta);
    accumRef.current += delta;

    // Each DEG_PER_STEP triggers a tick (sound + ring rotate always; value
    // only updates while not locked for the week)
    while (Math.abs(accumRef.current) >= DEG_PER_STEP) {
      const dir = accumRef.current > 0 ? 1 : -1;
      accumRef.current -= dir * DEG_PER_STEP;
      click();
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
      if (locked) continue;
      setValue((v) => {
        const next = v + dir;
        if (next < MIN) return MIN;
        if (next > MAX) return MAX;
        return next;
      });
    }
  };

  const endDrag = () => {
    draggingRef.current = false;
    accumRef.current = 0;
  };

  const dirty = !locked && value !== saved;

  const handleConfirm = () => {
    if (locked) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    setDailyGoal(value);
    const until = Date.now() + WIRD_LOCK_MS;
    setLockUntil(until);
    wirdSettingsService.save({ dailyGoal: value, lockedUntil: until });
  };


  const handleStart = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
    startWird();
    // Resume from the last successfully counted page (or wird start).
    const goalStart = state.lastReadPage || 1;
    const resumePage = goalStart + state.wird.pagesRead;
    navigate({ to: "/reading", search: { page: resumePage } as never });
  };

  const pagesRead = state.wird.pagesRead;

  return (
    <div dir="rtl" className="flex flex-col items-center w-full select-none">
      {/* ── Dial ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{ width: size, height: size }}
      >
        {/* Outer subtle gold halo */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 65%)",
            filter: "blur(8px)",
          }}
        />

        {/* Rotating mechanical ring */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `rotate(${angle}deg)`, transition: draggingRef.current ? "none" : "transform 200ms ease-out" }}
        >
          <svg width={size} height={size} className="overflow-visible">
            <defs>
              <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.a} />
                <stop offset="35%" stopColor={palette.b} />
                <stop offset="55%" stopColor={palette.c} />
                <stop offset="75%" stopColor={palette.d} />
                <stop offset="100%" stopColor={palette.e} />
              </linearGradient>
              <radialGradient id="dotGold" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={palette.dot1} />
                <stop offset="55%" stopColor={palette.dot2} />
                <stop offset="100%" stopColor={palette.dot3} />
              </radialGradient>
            </defs>

            {/* Base ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#goldRing)"
              strokeWidth={stroke}
              fill="none"
              style={{
                filter:
                  "drop-shadow(0 0 14px color-mix(in oklab, var(--primary) 55%, transparent))",
              }}
            />

            {/* Inner & outer hairlines for grooved feel */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - stroke / 2 + 1}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="1"
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius + stroke / 2 - 1}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="1"
              fill="none"
            />

            {/* Tick marks (10 steps) */}
            {tickAngles.map((a, i) => {
              const rad = ((a - 90) * Math.PI) / 180;
              const r1 = radius - stroke / 2 + 1;
              const r2 = radius + stroke / 2 - 1;
              const x1 = size / 2 + Math.cos(rad) * r1;
              const y1 = size / 2 + Math.sin(rad) * r1;
              const x2 = size / 2 + Math.cos(rad) * r2;
              const y2 = size / 2 + Math.sin(rad) * r2;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth="1.2"
                />
              );
            })}

            {/* Gold pointer dot at top */}
            <circle
              cx={size / 2}
              cy={stroke / 2 + 1}
              r={stroke / 2 + 2}
              fill="url(#dotGold)"
              style={{
                filter:
                  "drop-shadow(0 0 8px color-mix(in oklab, var(--primary) 90%, transparent))",
              }}
            />
          </svg>
        </div>

        {/* Center display (does NOT rotate) */}
        {/*
          Display rule (Wird Constitution):
            • While unlocked → show dial value being set (configuring goal).
            • Once locked (goal committed) → show progress / target, with the
              left digit CAPPED at target so it stays at "target/target" for
              the rest of the day even when bonus pages are read. The left
              digit only resets to 0 when a new calendar day starts (pagesRead
              resets via progressService).
        */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] text-muted-foreground mb-1 tracking-[0.2em]">
            صفحات اليوم
          </span>
          <div className="flex items-baseline gap-2" dir="ltr">
            <span
              className="text-7xl font-semibold tabular-nums leading-none"
              style={{
                background: `linear-gradient(180deg, ${palette.c} 0%, ${palette.b} 45%, ${palette.a} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter:
                  "drop-shadow(0 0 10px color-mix(in oklab, var(--primary) 55%, transparent))",
              }}
            >
              {value}
            </span>
            <span className="text-3xl text-muted-foreground/60">/</span>
            <span className="text-3xl text-foreground/70 tabular-nums">
              {locked ? Math.min(pagesRead, value) : value}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Lock size={10} />
            <span>{locked ? `مغلق ${daysLeft} يوم` : "عهد مُوثَّق"}</span>
          </div>
        </div>
      </div>

      {/* ── Action button (state-aware) ──────────────────── */}
      <button
        onClick={dirty ? handleConfirm : handleStart}
        className="mt-8 w-full flex items-center justify-center gap-3 py-4 rounded-2xl border font-semibold text-base transition-all active:scale-[0.99]"
        style={{
          borderColor: "color-mix(in oklab, var(--primary) 60%, transparent)",
          color: "var(--primary)",
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 10%, transparent), transparent)",
          boxShadow:
            "0 0 20px -6px color-mix(in oklab, var(--primary) 50%, transparent)",
        }}
      >
        {dirty ? <Check size={18} /> : <BookOpen size={18} />}
        <span>
          {dirty
            ? `تأكيد (${value})`
            : pagesRead > 0
              ? "تابع وردك"
              : "ابدأ وردك اليوم"}
        </span>
      </button>
    </div>
  );
}
