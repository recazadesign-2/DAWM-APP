import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, User, Bell, BookOpen, ChevronLeft, Sparkles, Target, LogIn, Camera, Loader2, Check, Settings as SettingsIcon, Users } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useApp, LEVEL_NAMES } from "@/contexts/AppContext";
import { LevelProgress } from "@/components/LevelProgress";
import { useAuth } from "@/contexts/AuthContext";
import { GuestLockCard } from "@/components/GuestLockCard";
import { subscribeToPush } from "@/services/pushService";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — الملف الشخصي" },
      { name: "description", content: "الإعدادات والملف الشخصي." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { state, toggleSetting, setReminderTime, setDailyGoal } = useApp();
  const { user, isGuest } = useAuth();
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setDisplayName(data?.display_name ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
      });
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    setSavingName(false);
    if (!error) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      setAvatarUrl(url);
    }
    setUploadingAvatar(false);
  };

  const isLocked = isGuest || !user;

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-[460px] mx-auto px-5 pt-6 dawm-fade-in">
        <header className="flex items-center justify-between mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowRight size={22} />
          </Link>
          <h1 className="text-lg font-bold font-display">الملف الشخصي</h1>
          <Link
            to="/settings"
            className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-foreground/80 dawm-press"
            aria-label="الإعدادات"
          >
            <SettingsIcon size={16} />
          </Link>
        </header>

        {/* User card / login prompt */}
        {user ? (
          <section
            className="rounded-3xl p-5 border border-border bg-card"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="relative w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: "var(--gradient-primary)" }}
                aria-label="تغيير صورة الملف الشخصي"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-primary-foreground" size={32} />
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white py-1 flex items-center justify-center">
                  {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
              <div className="flex-1 text-right min-w-0">
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {LEVEL_NAMES[state.level - 1] ?? "مبتدئ"} • {state.points} نقطة
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] text-muted-foreground mb-1.5 text-right">الاسم المعروض</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="اكتب اسمك"
                  className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-sm text-right"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-1 disabled:opacity-60"
                >
                  {savingName ? <Loader2 size={14} className="animate-spin" /> : savedFlash ? <Check size={14} /> : "حفظ"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <GuestLockCard
            title="أنت تتصفح كضيف"
            description="سجّل الدخول لإنشاء ملف شخصي، تخصيص اسمك وصورتك، ومتابعة نقاطك ومستواك."
          />
        )}

        {/* Level progress (registered only) */}
        {!isLocked && (
          <>
            <SectionTitle><Sparkles size={14} className="inline ml-1" /> مستواي</SectionTitle>
            <LevelProgress points={state.points} />
          </>
        )}

        {/* Daily goal — registered only */}
        {!isLocked && (
          <>
            <SectionTitle>الهدف اليومي</SectionTitle>
            <div
              className="rounded-2xl p-4 border border-border bg-card flex items-center gap-3"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--gradient-accent)" }}
              >
                <BookOpen size={18} className="text-primary-foreground" />
              </div>
              <div className="flex-1 text-right">
                <div className="text-sm font-bold">صفحات الورد اليومي</div>
                <div className="text-xs text-muted-foreground">
                  أنجزت {state.wird.pagesRead} من {state.dailyWirdPages} صفحات
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={state.dailyWirdPages}
                onChange={(e) => setDailyGoal(parseInt(e.target.value || "1"))}
                className="w-14 h-10 rounded-xl bg-input border border-border text-center font-bold tabular-nums"
              />
            </div>
          </>
        )}

        {/* Notifications — registered only */}
        {!isLocked && (
          <>
            <SectionTitle><Bell size={14} className="inline ml-1" /> التنبيهات الذكية</SectionTitle>
            <div className="space-y-2">
              <RowToggle
                icon={<BookOpen size={16} />}
                title="تنبيه الهدف اليومي"
                subtitle="تذكير يومي بالورد"
                value={state.notifications}
                onChange={() => toggleSetting("notifications")}
                extra={
                  <input
                    type="time"
                    value={state.reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-input rounded-xl px-3 py-1 text-xs border border-border tabular-nums"
                  />
                }
              />
              <button
                onClick={async () => { const r = await subscribeToPush(); setPushMsg(r.message); }}
                className="w-full rounded-2xl border border-border bg-card p-3 text-sm flex items-center gap-2 justify-center"
              >
                <Bell size={14} /> تفعيل إشعارات Push
              </button>
              {pushMsg && <p className="text-[11px] text-muted-foreground text-center">{pushMsg}</p>}
            </div>
          </>
        )}

        {!isLocked && (
          <>
            <SectionTitle><Users size={14} className="inline ml-1" /> لوحة العائلة</SectionTitle>
            <SettingsLink to="/family" icon={<Users size={16} />} title="تابع وردك مع أحبائك" subtitle="مشاركة التقدم والتشجيع" />
          </>
        )}

        {!isLocked && (
          <>
            <SectionTitle><Target size={14} className="inline ml-1" /> أهدافي</SectionTitle>
            <SettingsLink to="/goals/setup" icon={<Target size={16} />} title="إعداد الورد اليومي" subtitle={`${state.dailyWirdPages} صفحات`} />
          </>
        )}

        {/* Settings entry */}
        <SectionTitle>المزيد</SectionTitle>
        <SettingsLink to="/settings" icon={<SettingsIcon size={16} />} title="الإعدادات" subtitle="الصلاة، السمات، الدعم" />
        {isGuest && (
          <Link to="/auth" className="mt-3 block rounded-2xl p-4 border border-border bg-card text-center text-sm font-bold text-primary dawm-press">
            <LogIn size={14} className="inline ml-1" /> تسجيل الدخول لتفعيل كل الميزات
          </Link>
        )}
      </div>
      <BottomTabBar />
    </main>
  );
}

function SettingsLink({ to, icon, title, subtitle }: { to: string; icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <Link to={to as never}>
      <div className="rounded-2xl p-4 border border-border bg-card flex items-center gap-3 dawm-press">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          {icon}
        </div>
        <div className="flex-1 text-right">
          <div className="text-sm font-bold text-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <ChevronLeft size={18} className="text-muted-foreground" />
      </div>
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-2 text-xs text-muted-foreground text-right">{children}</h3>;
}

function RowToggle({ icon, title, subtitle, value, onChange, extra }: { icon: React.ReactNode; title: string; subtitle?: string; value: boolean; onChange: () => void; extra?: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 border border-border bg-card flex items-center gap-3" style={{ boxShadow: "var(--shadow-elegant)" }}>
      <button
        type="button"
        onClick={onChange}
        className={`w-12 h-7 rounded-full p-0.5 transition-colors flex items-center ${value ? "justify-end" : "justify-start"}`}
        style={{ background: value ? "var(--primary)" : "var(--muted)" }}
        aria-pressed={value}
      >
        <span className="block w-6 h-6 rounded-full bg-card shadow" />
      </button>
      {extra}
      <div className="flex-1 text-right">
        <div className="text-sm font-bold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
        <span className="text-primary-foreground">{icon}</span>
      </div>
    </div>
  );
}