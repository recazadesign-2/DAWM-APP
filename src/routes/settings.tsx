import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Headphones, Palette, Crown, Mail, ChevronLeft, LogOut, Clock } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — الإعدادات" },
      { name: "description", content: "إعدادات الصلاة، الصوت، السمات، والدعم." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, toggleSetting } = useApp();
  const { user, signOut } = useAuth();

  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-[460px] mx-auto px-5 pt-6 dawm-fade-in">
        <header className="flex items-center justify-between mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground dawm-press">
            <ArrowRight size={22} />
          </Link>
          <h1 className="text-lg font-bold font-display">الإعدادات</h1>
          <div className="w-6" />
        </header>

        {/* Prayer & Recitation */}
        <SectionTitle>الصلاة والتلاوة</SectionTitle>
        <Box>
          <RowLink to="/prayer" icon={<Clock size={16} />} title="مواقيت الصلاة" subtitle="إدارة المواقيت" />
          <Divider />
          <RowLink to="/prayer" icon={<MapPin size={16} />} title="الموقع الجغرافي" subtitle="القاهرة، مصر" />
          {user && (
            <>
              <Divider />
              <RowToggle
                icon={<Headphones size={16} />}
                title="جودة الصوت الفائقة"
                subtitle="تلاوة بدقة Lossless"
                value={state.losslessAudio}
                onChange={() => toggleSetting("losslessAudio")}
              />
            </>
          )}
        </Box>

        {/* Appearance */}
        <SectionTitle>المظهر</SectionTitle>
        <Box>
          <RowLink
            to="/themes"
            icon={<Palette size={16} />}
            title="السمات"
            subtitle="اختر من بين 6 سمات"
          />
        </Box>

        {/* Support */}
        <SectionTitle>الدعم</SectionTitle>
        <Box>
          <RowLink to="/premium" icon={<Crown size={16} />} title="الباقات المميزة" subtitle="ادعم تطوير التطبيق" />
          <Divider />
          <RowLink to="/contact" icon={<Mail size={16} />} title="تواصل معنا" subtitle="رأيك يهمنا" />
        </Box>

        {/* Account */}
        {user && (
          <>
            <SectionTitle>الحساب</SectionTitle>
            <Box>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 p-4 text-right dawm-press"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive">
                  <LogOut size={16} />
                </div>
                <div className="flex-1 text-right">
                  <div className="text-sm font-bold text-destructive">تسجيل الخروج</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </button>
            </Box>
          </>
        )}
      </div>
      <BottomTabBar />
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-2 text-xs text-muted-foreground text-right px-1">{children}</h3>;
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border mx-4" />;
}

function RowLink({ to, icon, title, subtitle }: { to: string; icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <Link to={to as never} className="flex items-center gap-3 p-4 dawm-press">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
        {icon}
      </div>
      <div className="flex-1 text-right">
        <div className="text-sm font-bold text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <ChevronLeft size={18} className="text-muted-foreground" />
    </Link>
  );
}

function RowToggle({ icon, title, subtitle, value, onChange }: { icon: React.ReactNode; title: string; subtitle?: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <button
        type="button"
        onClick={onChange}
        className={`w-12 h-7 rounded-full p-0.5 transition-colors flex items-center ${value ? "justify-end" : "justify-start"}`}
        style={{ background: value ? "var(--primary)" : "var(--muted)" }}
        aria-pressed={value}
      >
        <span className="block w-6 h-6 rounded-full bg-card shadow" />
      </button>
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