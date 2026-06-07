import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, RotateCcw, Save, Award, Crown, FlaskConical, Sparkles, Undo2,
} from "lucide-react";
import { LEVELS, levelService, type LevelDefinition } from "@/services/levelService";
import {
  DEFAULT_BADGES, getBadges, badgesService, type BadgeDef,
} from "@/services/badgesService";
import {
  gamificationService, CONDITION_LABELS,
  type BadgeCondition, type BadgeConditionKind, type CustomBadge,
} from "@/services/gamificationService";

export const Route = createFileRoute("/admin/gamification")({
  component: GamificationAdmin,
});

const CONDITION_KINDS: BadgeConditionKind[] = [
  "points_gte", "streak_gte", "pages_gte", "morning_done", "evening_done",
];

function GamificationAdmin() {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  useEffect(() => {
    const on = () => refresh();
    window.addEventListener("gamification-changed", on);
    window.addEventListener("points-changed", on);
    return () => {
      window.removeEventListener("gamification-changed", on);
      window.removeEventListener("points-changed", on);
    };
  }, []);

  const levels = useMemo(() => levelService.getLevels(), [/* refreshes via key */]);
  const badges = useMemo(() => getBadges(), []);

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-2xl font-bold mb-1">المستويات والأوسمة</h2>
        <p className="text-sm text-muted-foreground">
          عدّل أسماء المستويات، أدر الأوسمة وشروطها، وجرّب نظام النقاط مباشرة.
        </p>
      </header>

      <LevelsSection levels={levels} onChange={refresh} />
      <BadgesSection badges={badges} onChange={refresh} />
      <TestingTools onChange={refresh} />
    </div>
  );
}

/* ---------------- Levels ---------------- */

function LevelsSection({ levels, onChange }: { levels: LevelDefinition[]; onChange: () => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Crown size={18} className="text-primary" />
        <h3 className="font-semibold">المستويات</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        يمكنك تعديل اسم وعتبة ولون كل مستوى. التغييرات تُحفظ تلقائيًا وتنعكس فورًا.
      </p>

      <div className="space-y-3">
        {LEVELS.map((base) => {
          const eff = levels.find((l) => l.level === base.level) ?? base;
          return <LevelRow key={base.level} base={base} effective={eff} onChange={onChange} />;
        })}
      </div>
    </section>
  );
}

function LevelRow({
  base, effective, onChange,
}: { base: LevelDefinition; effective: LevelDefinition; onChange: () => void }) {
  const [name, setName] = useState(effective.name);
  const [threshold, setThreshold] = useState(String(effective.threshold));
  const [color, setColor] = useState(effective.color);

  useEffect(() => {
    setName(effective.name);
    setThreshold(String(effective.threshold));
    setColor(effective.color);
  }, [effective.name, effective.threshold, effective.color]);

  const dirty =
    name !== effective.name ||
    color !== effective.color ||
    Number(threshold) !== effective.threshold;

  const save = () => {
    gamificationService.setLevelOverride(base.level, {
      name: name.trim() || base.name,
      threshold: Math.max(0, Number(threshold) || 0),
      color,
    });
    onChange();
  };
  const reset = () => {
    gamificationService.clearLevelOverride(base.level);
    onChange();
  };

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3 grid md:grid-cols-[1fr_120px_60px_auto] gap-2 items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 px-3 rounded-md bg-background border border-input text-sm"
        placeholder={`اسم المستوى ${base.level}`}
      />
      <input
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        className="h-9 px-3 rounded-md bg-background border border-input text-sm tabular-nums"
        placeholder="العتبة"
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background"
        title="اللون"
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={save}
          disabled={!dirty}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs disabled:opacity-40"
        >
          <Save size={14} /> حفظ
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input text-xs hover:bg-muted"
          title="استرجاع الافتراضي"
        >
          <Undo2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Badges ---------------- */

function BadgesSection({ badges, onChange }: { badges: BadgeDef[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-primary" />
          <h3 className="font-semibold">الأوسمة</h3>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs"
        >
          <Plus size={14} /> {adding ? "إغلاق" : "وسام جديد"}
        </button>
      </div>

      {adding && <NewBadgeForm onSaved={() => { setAdding(false); onChange(); }} />}

      <div className="space-y-3 mt-3">
        {badges.map((b) => (
          <BadgeRow key={b.id} badge={b} onChange={onChange} />
        ))}
      </div>

      <RemovedDefaults onChange={onChange} />
    </section>
  );
}

function NewBadgeForm({ onSaved }: { onSaved: () => void }) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<BadgeConditionKind>("points_gte");
  const [value, setValue] = useState("100");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!cleanId || !label.trim()) { setErr("المعرّف والاسم مطلوبان"); return; }
    const condition: BadgeCondition = needsValue(kind)
      ? { kind, value: Math.max(0, Number(value) || 0) }
      : { kind };
    try {
      gamificationService.addCustomBadge({
        id: cleanId,
        label: label.trim(),
        description: description.trim(),
        condition,
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "تعذّر الحفظ");
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 grid gap-2">
      <div className="grid md:grid-cols-2 gap-2">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="المعرّف (id) — مثال: hafiz_master"
          className="h-9 px-3 rounded-md bg-background border border-input text-sm font-mono" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="اسم الوسام"
          className="h-9 px-3 rounded-md bg-background border border-input text-sm" />
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر"
        className="h-9 px-3 rounded-md bg-background border border-input text-sm" />
      <ConditionEditor kind={kind} value={value} onKind={setKind} onValue={setValue} />
      {err && <div className="text-xs text-destructive">{err}</div>}
      <button onClick={submit}
        className="self-end inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs">
        <Save size={14} /> إضافة الوسام
      </button>
    </div>
  );
}

function BadgeRow({ badge, onChange }: { badge: BadgeDef; onChange: () => void }) {
  const [label, setLabel] = useState(badge.label);
  const [description, setDescription] = useState(badge.description);
  const [kind, setKind] = useState<BadgeConditionKind>(badge.condition.kind);
  const [value, setValue] = useState(String(badge.condition.value ?? 0));

  useEffect(() => {
    setLabel(badge.label);
    setDescription(badge.description);
    setKind(badge.condition.kind);
    setValue(String(badge.condition.value ?? 0));
  }, [badge.id, badge.label, badge.description, badge.condition.kind, badge.condition.value]);

  const condition: BadgeCondition = needsValue(kind)
    ? { kind, value: Math.max(0, Number(value) || 0) }
    : { kind };

  const dirty =
    label !== badge.label ||
    description !== badge.description ||
    JSON.stringify(condition) !== JSON.stringify(badge.condition);

  const save = () => {
    if (badge.isDefault) {
      gamificationService.setBadgeOverride(badge.id, { label, description, condition });
    } else {
      gamificationService.updateCustomBadge(badge.id, { label, description, condition });
    }
    onChange();
  };
  const remove = () => {
    if (badge.isDefault) gamificationService.removeDefaultBadge(badge.id);
    else gamificationService.deleteCustomBadge(badge.id);
    onChange();
  };
  const restore = () => {
    gamificationService.clearBadgeOverride(badge.id);
    onChange();
  };

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-mono text-muted-foreground">{badge.id}</div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.isDefault ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>
          {badge.isDefault ? "افتراضي" : "مخصّص"}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="الاسم"
          className="h-9 px-3 rounded-md bg-background border border-input text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف"
          className="h-9 px-3 rounded-md bg-background border border-input text-sm" />
      </div>
      <ConditionEditor kind={kind} value={value} onKind={setKind} onValue={setValue} />
      <div className="flex items-center gap-1.5 justify-end pt-1">
        {badge.isDefault && (
          <button onClick={restore}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input text-xs hover:bg-muted"
            title="استرجاع القيم الافتراضية">
            <Undo2 size={14} />
          </button>
        )}
        <button onClick={save} disabled={!dirty}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs disabled:opacity-40">
          <Save size={14} /> حفظ
        </button>
        <button onClick={remove}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
          <Trash2 size={14} /> {badge.isDefault ? "إخفاء" : "حذف"}
        </button>
      </div>
    </div>
  );
}

function ConditionEditor({
  kind, value, onKind, onValue,
}: {
  kind: BadgeConditionKind; value: string;
  onKind: (k: BadgeConditionKind) => void; onValue: (v: string) => void;
}) {
  return (
    <div className="grid md:grid-cols-[1fr_140px] gap-2">
      <select value={kind} onChange={(e) => onKind(e.target.value as BadgeConditionKind)}
        className="h-9 px-3 rounded-md bg-background border border-input text-sm">
        {CONDITION_KINDS.map((k) => (
          <option key={k} value={k}>{CONDITION_LABELS[k]}</option>
        ))}
      </select>
      <input
        type="number" min={0} value={value} onChange={(e) => onValue(e.target.value)}
        disabled={!needsValue(kind)} placeholder="القيمة"
        className="h-9 px-3 rounded-md bg-background border border-input text-sm tabular-nums disabled:opacity-40"
      />
    </div>
  );
}

function needsValue(k: BadgeConditionKind) {
  return k === "points_gte" || k === "streak_gte" || k === "pages_gte";
}

function RemovedDefaults({ onChange }: { onChange: () => void }) {
  const removed = gamificationService.getConfig().removedDefaults;
  if (!removed.length) return null;
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground mb-2">أوسمة افتراضية مخفية:</div>
      <div className="flex flex-wrap gap-2">
        {removed.map((id) => {
          const def = DEFAULT_BADGES.find((b) => b.id === id);
          return (
            <button key={id}
              onClick={() => { gamificationService.restoreDefaultBadge(id); onChange(); }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-background border border-input text-xs">
              <Undo2 size={12} /> {def?.label ?? id}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Testing tools ---------------- */

function TestingTools({ onChange }: { onChange: () => void }) {
  const [pts, setPts] = useState<number>(levelService.getPoints());
  const [add, setAdd] = useState("100");
  const [setTo, setSetTo] = useState(String(pts));

  useEffect(() => {
    const on = () => setPts(levelService.getPoints());
    window.addEventListener("points-changed", on);
    return () => window.removeEventListener("points-changed", on);
  }, []);

  const info = levelService.getCurrentLevel(pts);
  const next = info.next;

  const doAdd = (n: number) => { levelService.addPoints(n); onChange(); };
  const doSet = (n: number) => {
    const old = levelService.getPoints();
    levelService.setPoints(Math.max(0, n));
    window.dispatchEvent(new CustomEvent("points-changed", { detail: { points: levelService.getPoints() } }));
    const oldLvl = levelService.getCurrentLevel(old).current.level;
    const newLvl = levelService.getCurrentLevel(levelService.getPoints()).current.level;
    if (newLvl > oldLvl) {
      window.dispatchEvent(new CustomEvent("level-up", { detail: { level: newLvl, oldLevel: oldLvl } }));
    }
    onChange();
  };
  const triggerLevelUp = () => {
    if (!next) return;
    doSet(next.threshold);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical size={18} className="text-primary" />
        <h3 className="font-semibold">أدوات الاختبار</h3>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-5">
        <Stat label="النقاط الحالية" value={pts.toLocaleString("ar-EG")} />
        <Stat label="المستوى" value={`${info.current.level} — ${info.current.name}`} />
        <Stat label="للوصول للتالي" value={next ? `${info.pointsToNext} نقطة` : "أقصى مستوى"} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
          <div className="text-xs font-semibold text-foreground">إضافة نقاط</div>
          <div className="flex items-center gap-2">
            <input type="number" value={add} onChange={(e) => setAdd(e.target.value)}
              className="h-9 px-3 rounded-md bg-background border border-input text-sm tabular-nums flex-1" />
            <button onClick={() => doAdd(Number(add) || 0)}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs">
              <Plus size={14} /> إضافة
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[10, 50, 100, 500, 1000].map((n) => (
              <button key={n} onClick={() => doAdd(n)}
                className="h-7 px-2 rounded-md border border-input text-xs hover:bg-muted">+{n}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
          <div className="text-xs font-semibold text-foreground">ضبط النقاط مباشرة</div>
          <div className="flex items-center gap-2">
            <input type="number" value={setTo} onChange={(e) => setSetTo(e.target.value)}
              className="h-9 px-3 rounded-md bg-background border border-input text-sm tabular-nums flex-1" />
            <button onClick={() => doSet(Number(setTo) || 0)}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input text-xs hover:bg-muted">
              <Save size={14} /> تعيين
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground">
            يطلق حدث الترقية تلقائيًا إذا تجاوزت عتبة مستوى أعلى.
          </div>
        </div>
      </div>

      <div className="mt-3 grid md:grid-cols-3 gap-2">
        <button onClick={triggerLevelUp} disabled={!next}
          className="inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-40">
          <Sparkles size={16} /> اختبار الترقية للمستوى التالي
        </button>
        <button onClick={() => { badgesService.reset(); onChange(); }}
          className="inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-input text-sm hover:bg-muted">
          <RotateCcw size={16} /> تصفير سجل الأوسمة
        </button>
        <button onClick={() => { doSet(0); }}
          className="inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10">
          <RotateCcw size={16} /> تصفير النقاط
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border p-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">إعادة كل إعدادات المستويات والأوسمة للوضع الافتراضي</div>
        <button onClick={() => { gamificationService.resetAll(); onChange(); }}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input text-xs hover:bg-muted">
          <Undo2 size={14} /> استرجاع الإعدادات
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
