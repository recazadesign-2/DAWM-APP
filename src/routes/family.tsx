import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Users,
  Crown,
  Plus,
  Sparkles,
  Camera,
  Trash2,
  Trash,
  LogOut,
  Bell,
  Check,
  X,
  Loader2,
  Mail,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BottomTabBar } from "@/components/BottomTabBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — المجموعات ولوحة المتصدرين" },
      {
        name: "description",
        content: "تابع تقدم مجموعاتك في الورد اليومي ولوحة متصدرين حيّة.",
      },
    ],
  }),
  component: GroupsPage,
});

// ─────────── Types ───────────
const GROUP_TYPES = ["العائلة", "الأصدقاء", "العمل", "الأبناء"] as const;
type GroupType = (typeof GROUP_TYPES)[number];

type MemberRole = "admin" | "member" | "observer";

type Member = {
  id: string; // group_members.id
  userId: string;
  name: string;
  progress: number; // 0..100 today
  points: number;
  role: MemberRole;
  isMe: boolean;
  quranPagesRead: number;
  quranTarget: number;
  morningDone: boolean;
  eveningDone: boolean;
};

type Group = {
  id: string;
  name: string;
  type: string; // free-form, read from DB
  image?: string | null;
  createdBy: string;
};

type Invitation = {
  id: string;
  groupId: string;
  groupName: string;
  groupType: string;
  invitedBy: string;
  inviterName: string;
  createdAt: string;
  role: MemberRole;
};

// ─────────── Progress Ring ───────────
function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  complete,
}: {
  value: number;
  size?: number;
  stroke?: number;
  complete: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - Math.min(100, Math.max(0, value)) / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          initial={false}
          animate={{ strokeDashoffset: dash }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
          style={{ strokeDasharray: c }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "text-[11px] font-bold tabular-nums",
            complete ? "text-accent" : "text-foreground",
          )}
        >
          {Math.round(value)}%
        </span>
      </div>
    </div>
  );
}

// ─────────── Member Card ───────────
function MemberCard({
  member,
  rank,
  canRemove,
  canLeave,
  onRemove,
  onLeave,
  expandable = false,
  expanded = false,
  onToggle,
  weeklyPct,
  weeklyLoading,
}: {
  member: Member;
  rank: number;
  canRemove: boolean;
  canLeave: boolean;
  onRemove: () => void;
  onLeave: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  weeklyPct?: number | null;
  weeklyLoading?: boolean;
}) {
  const complete = member.progress === 100;
  const pagesSummary = `${member.quranPagesRead.toLocaleString("ar-EG")} من ${member.quranTarget.toLocaleString("ar-EG")} ${member.quranTarget === 1 || member.quranTarget === 2 ? "صفحة" : "صفحات"}`;
  const statusText = complete
    ? "أتمَّ ورد اليوم"
    : member.progress >= 60
      ? "في تقدّم ممتاز"
      : member.progress > 0
        ? "بدأ ورده"
        : "لم يبدأ بعد";

  return (
    <motion.li
      layout
      layoutId={member.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
      className={cn(
        "relative rounded-3xl border overflow-hidden backdrop-blur-xl",
        complete
          ? "border-accent/50 bg-gradient-to-br from-accent/10 via-card/80 to-primary/10"
          : "border-border/60 bg-card/70",
      )}
      style={
        complete
          ? {
              boxShadow:
                "0 0 0 1px color-mix(in oklab, var(--accent) 35%, transparent), 0 12px 40px -8px color-mix(in oklab, var(--accent) 45%, transparent), 0 0 60px -10px color-mix(in oklab, var(--primary) 35%, transparent)",
            }
          : { boxShadow: "var(--shadow-elegant, 0 6px 24px -12px rgba(0,0,0,.35))" }
      }
    >
      {complete && (
        <>
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--accent) 22%, transparent) 0%, transparent 60%)",
            }}
          />
          <motion.div
            aria-hidden
            className="absolute -top-1 -right-1 text-accent"
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1, 0.9] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={16} />
          </motion.div>
        </>
      )}

      <div
        className={cn(
          "relative flex items-center gap-3 p-4",
          expandable && "cursor-pointer select-none",
        )}
        onClick={expandable ? onToggle : undefined}
        role={expandable ? "button" : undefined}
        aria-expanded={expandable ? expanded : undefined}
      >
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-2xl text-sm font-bold tabular-nums shrink-0",
            rank === 1
              ? "bg-accent/20 text-accent"
              : rank === 2
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          {rank === 1 ? <Crown size={16} /> : rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold truncate">{member.name}</span>
            {member.isMe && (
              <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/30">
                أنا
              </span>
            )}
            {complete && (
              <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/30">
                مكتمل
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {member.points.toLocaleString("ar-EG")} نقطة
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="truncate">
              {expandable
                ? `${Math.round(member.progress)}% • ${member.quranPagesRead} صفحة`
                : statusText}
            </span>
          </div>
        </div>

        <ProgressRing value={member.progress} complete={complete} />

        {(canRemove || canLeave) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (canLeave) onLeave();
              else onRemove();
            }}
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 hover:opacity-100 transition-all"
            aria-label={canLeave ? "مغادرة" : "إزالة"}
            title={canLeave ? "مغادرة المجموعة" : "إزالة العضو"}
          >
            {canLeave ? <LogOut size={15} /> : <Trash2 size={15} />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expandable && expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">
              {/* Weekly commitment */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    معدل الالتزام الأسبوعي
                  </span>
                  <span className="text-xs font-bold tabular-nums">
                    {weeklyLoading || weeklyPct == null
                      ? "…"
                      : `${weeklyPct}%`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={false}
                    animate={{ width: `${weeklyPct ?? 0}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 20 }}
                    style={{
                      background:
                        "linear-gradient(90deg, var(--primary), var(--accent))",
                    }}
                  />
                </div>
              </div>

              {/* Quran progress */}
              <div className="rounded-2xl px-3 py-2.5 bg-background/40 border border-border/40">
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  تفاصيل الورد
                </div>
                <div className="text-sm font-bold">
                  تم قراءة {pagesSummary}
                </div>
              </div>

              {/* Adhkar indicators */}
              <div className="grid grid-cols-2 gap-2">
                <AdhkarIndicator label="أذكار الصباح" done={member.morningDone} />
                <AdhkarIndicator label="أذكار المساء" done={member.eveningDone} />
              </div>

              {/* Daily completion summary */}
              <div className="flex items-center justify-between rounded-2xl px-3 py-2 bg-primary/5 border border-primary/20">
                <span className="text-xs text-muted-foreground">
                  نسبة إنجاز اليوم
                </span>
                <span className="text-sm font-bold tabular-nums text-primary">
                  {Math.round(member.progress)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function AdhkarIndicator({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl px-3 py-2 bg-background/40 border border-border/40">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        aria-hidden
        className={cn(
          "w-2.5 h-2.5 rounded-full transition-all",
          done ? "bg-accent" : "bg-muted-foreground/30",
        )}
        style={
          done
            ? {
                boxShadow:
                  "0 0 0 2px color-mix(in oklab, var(--accent) 25%, transparent), 0 0 12px color-mix(in oklab, var(--accent) 70%, transparent)",
              }
            : undefined
        }
      />
    </div>
  );
}

// ─────────── Create Group Dialog ───────────
function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("العائلة");
  const [image, setImage] = useState<string | undefined>();
  const [invites, setInvites] = useState<{ email: string }[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setType("العائلة");
    setImage(undefined);
    setInvites([]);
    setNewEmail("");
    setEmailError(null);
    setSubmitting(false);
    setCheckingEmail(false);
  };

  const addEmail = async () => {
    const e = newEmail.trim().toLowerCase();
    setEmailError(null);
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailError("صيغة البريد غير صحيحة");
      return;
    }
    if (e === user?.email?.toLowerCase()) {
      setEmailError("أنت عضو بالفعل في المجموعة");
      return;
    }
    if (invites.find((i) => i.email === e)) {
      setEmailError("هذا البريد مُضاف بالفعل");
      return;
    }
    setCheckingEmail(true);
    const { data, error } = await supabase.rpc("find_user_id_by_email", {
      _email: e,
    });
    setCheckingEmail(false);
    if (error) {
      setEmailError("حدث خطأ، حاول مجدداً");
      return;
    }
    if (!data) {
      setEmailError("هذا الحساب غير مسجل في تطبيق داوم");
      return;
    }
    setInvites((prev) => [...prev, { email: e }]);
    setNewEmail("");
  };

  const removeEmail = (e: string) =>
    setInvites((prev) => prev.filter((x) => x.email !== e));

  const onPickImage = (file?: File) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      toast.error("حجم الصورة كبير (الحد 800KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSubmit =
    name.trim().length > 0 && invites.length >= 1 && !submitting && !!user;

  const submit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    try {
      const { data: g, error: gErr } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          group_type: type,
          image_url: image ?? null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (gErr) throw gErr;

      // Automatic role assignment: all invited users are members.
      // (Creator's role is auto-assigned by DB trigger based on group_type:
      //  observer for "الأبناء", member otherwise.)
      const resolved: { uid: string }[] = [];
      for (const inv of invites) {
        const { data: uid } = await supabase.rpc("find_user_id_by_email", {
          _email: inv.email,
        });
        if (uid) resolved.push({ uid: uid as string });
      }
      if (resolved.length > 0) {
        const rows = resolved.map((r) => ({
          group_id: g.id,
          invited_user_id: r.uid,
          invited_by: user.id,
          role: "member",
        }));
        const { error: iErr } = await supabase
          .from("group_invitations")
          .insert(rows);
        if (iErr) throw iErr;
      }
      toast.success("تم إنشاء المجموعة وإرسال الدعوات");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر إنشاء المجموعة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent dir="rtl" className="sm:max-w-[460px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">إنشاء مجموعة جديدة</DialogTitle>
          <DialogDescription>
            ادعُ أعضاءً مسجّلين في داوم عبر بريدهم الإلكتروني.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-2xl overflow-hidden border border-border/60 bg-muted flex items-center justify-center shrink-0"
            aria-label="صورة المجموعة"
          >
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera size={20} className="text-muted-foreground" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0])}
          />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              اسم المجموعة
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              placeholder="مثال: عائلة الرحمن"
              className="rounded-xl"
            />
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">نوع المجموعة</div>
          <div className="flex flex-wrap gap-2">
            {GROUP_TYPES.map((t) => {
              const active = t === type;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "px-3 h-9 rounded-2xl text-sm font-bold border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-card/60 text-foreground border-border/60 hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              دعوة الأعضاء بالبريد ({invites.length})
            </span>
            <span
              className={cn(
                "text-[11px] font-bold",
                invites.length >= 1 ? "text-accent" : "text-muted-foreground",
              )}
            >
              عضو واحد على الأقل
            </span>
          </div>

          {/* Role selection removed — assignment is fully automatic.
              Creator's role is set by DB trigger based on group type. */}

          <div className="flex gap-2 mb-1">
            <Input
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailError(null);
              }}
              placeholder="email@example.com"
              type="email"
              dir="ltr"
              className="rounded-xl text-left"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
            />
            <Button
              type="button"
              onClick={addEmail}
              disabled={!newEmail.trim() || checkingEmail}
              className="rounded-xl shrink-0"
            >
              {checkingEmail ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              إضافة
            </Button>
          </div>
          {emailError && (
            <p className="text-xs text-destructive mt-1 mb-2">{emailError}</p>
          )}

          <ul className="space-y-1.5 max-h-40 overflow-y-auto mt-2">
            {invites.map((inv) => (
              <li
                key={inv.email}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/40"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm font-medium truncate" dir="ltr">
                    {inv.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeEmail(inv.email)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-xl"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            إنشاء المجموعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────── Add Member (invite by email) Dialog ───────────
function AddMemberDialog({
  open,
  onOpenChange,
  groupId,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  onInvited: () => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    const e = email.trim().toLowerCase();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError("صيغة البريد غير صحيحة");
      return;
    }
    if (e === user.email?.toLowerCase()) {
      setError("أنت عضو بالفعل");
      return;
    }
    setSubmitting(true);
    try {
      const { data: uid, error: rErr } = await supabase.rpc(
        "find_user_id_by_email",
        { _email: e },
      );
      if (rErr) throw rErr;
      if (!uid) {
        setError("هذا الحساب غير مسجل في تطبيق داوم");
        setSubmitting(false);
        return;
      }
      const { error: iErr } = await supabase.from("group_invitations").insert({
        group_id: groupId,
        invited_user_id: uid as string,
        invited_by: user.id,
      });
      if (iErr) {
        if (iErr.code === "23505") {
          setError("هذا الشخص لديه دعوة معلقة بالفعل");
        } else {
          setError(iErr.message);
        }
        setSubmitting(false);
        return;
      }
      toast.success("تم إرسال الدعوة");
      setEmail("");
      onOpenChange(false);
      onInvited();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setEmail("");
          setError(null);
        }
      }}
    >
      <DialogContent dir="rtl" className="sm:max-w-[400px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">دعوة عضو</DialogTitle>
          <DialogDescription>
            أدخل بريد عضو مسجّل في داوم لإرسال دعوة الانضمام.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="email@example.com"
          type="email"
          dir="ltr"
          className="rounded-xl text-left"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={submit}
            disabled={!email.trim() || submitting}
            className="rounded-xl"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            إرسال الدعوة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────── Invitations Sheet ───────────
function InvitationsDialog({
  open,
  onOpenChange,
  invitations,
  onRespond,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invitations: Invitation[];
  onRespond: (inv: Invitation, accept: boolean) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = async (inv: Invitation, accept: boolean) => {
    setBusyId(inv.id);
    await onRespond(inv, accept);
    setBusyId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-[440px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Bell size={18} /> دعوات معلقة
          </DialogTitle>
          <DialogDescription>
            دعواتك للانضمام إلى مجموعات داوم.
          </DialogDescription>
        </DialogHeader>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            لا توجد دعوات معلقة حالياً.
          </div>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="rounded-2xl border border-border/60 bg-card/60 p-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary), var(--accent))",
                    }}
                  >
                    <Users size={16} className="text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{inv.groupName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {inv.groupType} · دعوة من {inv.inviterName}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handle(inv, true)}
                    disabled={busyId === inv.id}
                    className="flex-1 rounded-xl"
                  >
                    {busyId === inv.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    قبول
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handle(inv, false)}
                    disabled={busyId === inv.id}
                    className="flex-1 rounded-xl"
                  >
                    <X size={14} />
                    رفض
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────── Main Page ───────────
function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [memberAction, setMemberAction] = useState<Member | null>(null);
  const [isLeaveAction, setIsLeaveAction] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [weeklyMap, setWeeklyMap] = useState<Record<string, number>>({});
  const [weeklyLoadingId, setWeeklyLoadingId] = useState<string | null>(null);

  const active = groups.find((g) => g.id === activeId) ?? null;
  const isAdmin = active && user ? active.createdBy === user.id : false;
  const isChildrenGroup = active?.type === "الأبناء";

  // Reset expansion when switching groups
  useEffect(() => {
    setExpandedMemberId(null);
  }, [activeId]);

  // Lazy fetch weekly commitment for a child when their card expands
  const loadWeeklyForUser = useCallback(
    async (userId: string) => {
      if (weeklyMap[userId] != null) return;
      setWeeklyLoadingId(userId);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const { data } = await supabase
        .from("user_daily_progress")
        .select("completion_pct")
        .eq("user_id", userId)
        .gte("date", fmt(start))
        .lte("date", fmt(end));
      const rows = (data ?? []) as { completion_pct: number }[];
      const avg = rows.length
        ? Math.round(
            rows.reduce((s, r) => s + (r.completion_pct ?? 0), 0) / 7,
          )
        : 0;
      setWeeklyMap((prev) => ({ ...prev, [userId]: avg }));
      setWeeklyLoadingId((cur) => (cur === userId ? null : cur));
    },
    [weeklyMap],
  );

  const handleToggleExpand = useCallback(
    (m: Member) => {
      setExpandedMemberId((cur) => {
        const next = cur === m.id ? null : m.id;
        if (next) loadWeeklyForUser(m.userId);
        return next;
      });
    },
    [loadWeeklyForUser],
  );

  // ── Fetch groups ──
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, group_type, image_url, created_by")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("تعذّر تحميل المجموعات");
      return;
    }
    const mapped: Group[] = (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      type: g.group_type as string,
      image: g.image_url,
      createdBy: g.created_by,
    }));
    setGroups(mapped);
    if (mapped.length > 0 && !mapped.find((g) => g.id === activeId)) {
      setActiveId(mapped[0].id);
    } else if (mapped.length === 0) {
      setActiveId(null);
    }
  }, [user, activeId]);

  // ── Fetch invitations ──
  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("group_invitations")
      .select("id, group_id, invited_by, created_at, status, role")
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error || !data) return;
    if (data.length === 0) {
      setInvitations([]);
      return;
    }
    const groupIds = [...new Set(data.map((d: any) => d.group_id))];
    const inviterIds = [...new Set(data.map((d: any) => d.invited_by))];
    const [{ data: gs }, { data: ps }] = await Promise.all([
      supabase
        .from("groups")
        .select("id, name, group_type")
        .in("id", groupIds as string[]),
      supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", inviterIds as string[]),
    ]);
    const gMap = new Map((gs ?? []).map((g) => [g.id, g]));
    const pMap = new Map((ps ?? []).map((p) => [p.id, p.display_name]));
    setInvitations(
      (data as any[]).map((d) => ({
        id: d.id,
        groupId: d.group_id,
        groupName: gMap.get(d.group_id)?.name ?? "مجموعة",
        groupType: gMap.get(d.group_id)?.group_type ?? "",
        invitedBy: d.invited_by,
        inviterName: pMap.get(d.invited_by) ?? "مستخدم",
        createdAt: d.created_at,
        role: (d.role ?? "member") as MemberRole,
      })),
    );
  }, [user]);

  // ── Fetch members + today's daily progress ──
  const fetchMembers = useCallback(async () => {
    if (!activeId) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    const { data, error } = await supabase
      .from("group_members")
      .select("id, user_id, role, progress, points")
      .eq("group_id", activeId);
    if (error || !data) {
      setMembers([]);
      setMembersLoading(false);
      return;
    }
    const ids = data.map((m) => m.user_id);
    const todayStr = new Date().toISOString().slice(0, 10);
    const [{ data: ps }, { data: progRows }] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", ids),
      supabase
        .from("user_daily_progress")
        .select("user_id, completion_pct, points, quran_pages_read, quran_target, morning_done, evening_done")
        .in("user_id", ids)
        .eq("date", todayStr),
    ]);
    const pMap = new Map((ps ?? []).map((p) => [p.id, p.display_name]));
    const dMap = new Map(
      (progRows ?? []).map((r: any) => [r.user_id, r]),
    );
    setMembers(
      data.map((m) => {
        const today = dMap.get(m.user_id) as any;
        return {
          id: m.id,
          userId: m.user_id,
          name: pMap.get(m.user_id) ?? "عضو",
          role: m.role as MemberRole,
          // DB is the single source of truth for today
          progress: today?.completion_pct ?? 0,
          points: today?.points ?? m.points ?? 0,
          isMe: m.user_id === user?.id,
          quranPagesRead: today?.quran_pages_read ?? 0,
          quranTarget: today?.quran_target ?? 0,
          morningDone: !!today?.morning_done,
          eveningDone: !!today?.evening_done,
        } satisfies Member;
      }),
    );
    setMembersLoading(false);
  }, [activeId, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchGroups(), fetchInvitations()]).finally(() =>
      setLoading(false),
    );
  }, [user, authLoading, fetchGroups, fetchInvitations]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Competitors only — observers are excluded from leaderboard and stats
  const competitors = useMemo(
    () => members.filter((m) => m.role !== "observer"),
    [members],
  );
  const observers = useMemo(
    () => members.filter((m) => m.role === "observer"),
    [members],
  );

  // Primary: completion % DESC. Secondary: points DESC.
  const sorted = useMemo(
    () =>
      [...competitors].sort(
        (a, b) => b.progress - a.progress || b.points - a.points,
      ),
    [competitors],
  );

  const totalProgress = competitors.length
    ? Math.round(
        competitors.reduce((s, m) => s + m.progress, 0) / competitors.length,
      )
    : 0;
  const totalPoints = competitors.reduce((s, m) => s + (m.points ?? 0), 0);
  const completedToday = competitors.filter((m) => m.progress === 100).length;

  // ── Realtime: refresh on member or daily-progress changes ──
  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`group-${activeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${activeId}` },
        () => fetchMembers(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_daily_progress" },
        () => fetchMembers(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId, fetchMembers]);

  // ── Actions ──
  const respondInvitation = async (inv: Invitation, accept: boolean) => {
    if (!user) return;
    try {
      if (accept) {
        const { error: mErr } = await supabase
          .from("group_members")
          .insert({
            group_id: inv.groupId,
            user_id: user.id,
            role: inv.role === "observer" ? "observer" : "member",
          });
        if (mErr && mErr.code !== "23505") throw mErr;
      }
      const { error: uErr } = await supabase
        .from("group_invitations")
        .update({
          status: accept ? "accepted" : "declined",
          responded_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
      if (uErr) throw uErr;
      toast.success(accept ? "تم الانضمام للمجموعة" : "تم رفض الدعوة");
      await Promise.all([fetchGroups(), fetchInvitations(), fetchMembers()]);
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّرت العملية");
    }
  };

  const deleteGroup = async () => {
    if (!active) return;
    const { error } = await supabase.from("groups").delete().eq("id", active.id);
    if (error) {
      toast.error("تعذّر حذف المجموعة");
      return;
    }
    toast.success("تم حذف المجموعة");
    setConfirmDelete(false);
    setActiveId(null);
    await fetchGroups();
  };

  const removeMember = async (m: Member) => {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("id", m.id);
    if (error) {
      toast.error("تعذّرت الإزالة");
      return;
    }
    toast.success(m.isMe ? "غادرتَ المجموعة" : "تمت إزالة العضو");
    setMemberAction(null);
    if (m.isMe) {
      setActiveId(null);
      await fetchGroups();
    } else {
      await fetchMembers();
    }
  };

  if (authLoading || loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-background text-foreground flex items-center justify-center"
      >
        <Loader2 className="animate-spin text-primary" size={28} />
      </main>
    );
  }

  if (!user) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center"
      >
        <Users size={42} className="text-primary mb-3" />
        <h1 className="text-lg font-bold mb-2">المجموعات تتطلّب تسجيل الدخول</h1>
        <p className="text-sm text-muted-foreground mb-4">
          سجّل الدخول لإنشاء مجموعات والمنافسة مع أحبائك في الورد اليومي.
        </p>
        <Link to="/auth">
          <Button className="rounded-xl">تسجيل الدخول</Button>
        </Link>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-[460px] mx-auto px-5 pt-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-5">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground"
            aria-label="رجوع"
          >
            <ArrowRight size={22} />
          </Link>
          <h1 className="text-lg font-bold font-display">المجموعات</h1>
          <div className="flex items-center gap-1">
            <button
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="الدعوات المعلقة"
              onClick={() => setInvitesOpen(true)}
            >
              <Bell size={18} />
              {invitations.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                  {invitations.length}
                </span>
              )}
            </button>
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              aria-label="مجموعة جديدة"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        {/* Group tabs */}
        {groups.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 mb-5 scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {groups.map((g) => {
              const isActive = g.id === activeId;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveId(g.id)}
                  className={cn(
                    "relative shrink-0 px-4 h-10 rounded-2xl text-sm font-bold transition-colors border",
                    isActive
                      ? "text-primary-foreground border-transparent"
                      : "text-muted-foreground border-border/60 bg-card/50 backdrop-blur",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="group-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary), var(--accent))",
                        boxShadow:
                          "0 8px 24px -10px color-mix(in oklab, var(--primary) 60%, transparent)",
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative">{g.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!active && (
          <div className="rounded-3xl border border-dashed border-border/60 p-8 text-center bg-card/40 backdrop-blur">
            <div
              className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
              }}
            >
              <Users size={22} className="text-primary-foreground" />
            </div>
            <h2 className="font-bold mb-1">لا توجد مجموعات بعد</h2>
            <p className="text-sm text-muted-foreground mb-4">
              أنشئ مجموعتك الأولى أو اقبل دعوة معلقة.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setCreateOpen(true)} className="rounded-xl">
                <Plus size={16} /> إنشاء مجموعة
              </Button>
              {invitations.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setInvitesOpen(true)}
                  className="rounded-xl"
                >
                  <Mail size={16} /> دعوات ({invitations.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {active && (
          <>
            <motion.section
              layout
              className="relative rounded-3xl p-5 mb-6 overflow-hidden border border-border/60"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--card) 85%, transparent), color-mix(in oklab, var(--card) 60%, transparent))",
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 20px 60px -20px color-mix(in oklab, var(--primary) 35%, transparent)",
              }}
            >
              <div
                aria-hidden
                className="absolute -top-16 -left-10 w-48 h-48 rounded-full opacity-30 blur-3xl"
                style={{ background: "var(--primary)" }}
              />
              <div
                aria-hidden
                className="absolute -bottom-16 -right-10 w-48 h-48 rounded-full opacity-25 blur-3xl"
                style={{ background: "var(--accent)" }}
              />

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary), var(--accent))",
                    }}
                  >
                    {active.image ? (
                      <img
                        src={active.image}
                        alt={active.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={20} className="text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                      <motion.h2
                        key={active.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="font-bold text-base truncate"
                      >
                        {active.name}
                      </motion.h2>
                    </AnimatePresence>
                    <p className="text-xs text-muted-foreground">
                      {competitors.length} عضو{observers.length > 0 ? ` · ${observers.length} مراقب` : ""} — تنافس يومي
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setAddMemberOpen(true)}
                      className="w-9 h-9 rounded-2xl flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      aria-label="دعوة عضو"
                      title="دعوة عضو"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                  {isAdmin ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-9 h-9 rounded-2xl flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      aria-label="حذف المجموعة"
                      title="حذف المجموعة"
                    >
                      <Trash size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const me = members.find((m) => m.isMe);
                        if (me) {
                          setIsLeaveAction(true);
                          setMemberAction(me);
                        }
                      }}
                      className="w-9 h-9 rounded-2xl flex items-center justify-center bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="مغادرة المجموعة"
                      title="مغادرة المجموعة"
                    >
                      <LogOut size={16} />
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      التقدّم الجماعي
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {totalProgress}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={false}
                      animate={{ width: `${totalProgress}%` }}
                      transition={{ type: "spring", stiffness: 90, damping: 20 }}
                      style={{
                        background:
                          "linear-gradient(90deg, var(--primary), var(--accent))",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-3 bg-background/40 border border-border/40">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      إجمالي النقاط
                    </div>
                    <div className="font-bold text-lg tabular-nums">
                      {totalPoints.toLocaleString("ar-EG")}
                    </div>
                  </div>
                  <div className="rounded-2xl p-3 bg-background/40 border border-border/40">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      المكتمل اليوم
                    </div>
                    <div className="font-bold text-lg tabular-nums">
                      {completedToday}/
                      {competitors.length}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">{active.type}</h3>
              <span className="text-[11px] text-muted-foreground">
                {membersLoading ? "تحديث..." : "مباشر"}
              </span>
            </div>

            <motion.ul layout className="space-y-3">
              <AnimatePresence initial={false}>
                {sorted.map((m, i) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    rank={i + 1}
                    canRemove={isAdmin && !m.isMe}
                    canLeave={m.isMe && !isAdmin}
                    onRemove={() => {
                      setIsLeaveAction(false);
                      setMemberAction(m);
                    }}
                    onLeave={() => {
                      setIsLeaveAction(true);
                      setMemberAction(m);
                    }}
                    expandable={isChildrenGroup}
                    expanded={expandedMemberId === m.id}
                    onToggle={() => handleToggleExpand(m)}
                    weeklyPct={weeklyMap[m.userId] ?? null}
                    weeklyLoading={weeklyLoadingId === m.userId}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          </>
        )}
      </div>

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchGroups}
      />
      {active && (
        <AddMemberDialog
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          groupId={active.id}
          onInvited={fetchInvitations}
        />
      )}
      <InvitationsDialog
        open={invitesOpen}
        onOpenChange={setInvitesOpen}
        invitations={invitations}
        onRespond={respondInvitation}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent dir="rtl" className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المجموعة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المجموعة وجميع أعضائها ودعواتها نهائياً. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteGroup}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!memberAction}
        onOpenChange={(v) => {
          if (!v) setMemberAction(null);
        }}
      >
        <AlertDialogContent dir="rtl" className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isLeaveAction ? "مغادرة المجموعة؟" : `إزالة ${memberAction?.name}؟`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLeaveAction
                ? "ستفقد مكانك في لوحة المتصدرين. يمكنك العودة عند تلقي دعوة جديدة."
                : "سيُزال هذا العضو من المجموعة فوراً."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberAction && removeMember(memberAction)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaveAction ? "نعم، غادر" : "نعم، أزل"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomTabBar />
    </main>
  );
}
