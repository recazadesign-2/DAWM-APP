import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LayoutDashboard, Edit3, BarChart3, BookOpen, Bell, Settings, LogOut, Crown, ArrowRight, Award, Users, Sliders, LifeBuoy, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — دَاوِمْ" },
      { name: "description", content: "لوحة تحكم إدارية لتطبيق دَاوِمْ." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "المستخدمون", icon: Users },
  { to: "/admin/engine", label: "إعدادات المحرك", icon: Sliders },
  { to: "/admin/support", label: "الدعم والبلاغات", icon: LifeBuoy },
  { to: "/admin/advanced", label: "الوحدات المتقدمة", icon: ShieldCheck },
  { to: "/admin/editor", label: "المحرر المباشر", icon: Edit3 },
  { to: "/admin/analytics", label: "الإحصائيات", icon: BarChart3 },
  { to: "/admin/content", label: "المحتوى", icon: BookOpen },
  { to: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { to: "/admin/gamification", label: "المستويات والأوسمة", icon: Award },
  { to: "/admin/premium", label: "التفعيل المميّز", icon: Crown },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
] as const;

function AdminLayout() {
  const { user, isAdmin, roleChecked, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  if (loading || !user || !roleChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center rounded-2xl border border-border bg-card p-6">
          <h1 className="text-lg font-bold text-foreground mb-2">صلاحيات غير كافية</h1>
          <p className="text-sm text-muted-foreground mb-4">
            هذا الحساب لا يملك صلاحية الوصول للوحة الإدارة. يجب منحه دور <code>admin</code> أولاً.
          </p>
          <button onClick={() => signOut()} className="text-xs text-primary">تسجيل الخروج</button>
          <Link to="/" className="block text-xs text-muted-foreground mt-2">العودة للرئيسية</Link>
        </div>
      </main>
    );
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + "/");

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-l border-border bg-card/40 backdrop-blur sticky top-0 h-screen flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <h1 className="font-logo text-2xl text-primary">دَاوِمْ</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">لوحة الإدارة</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, (item as any).exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <div className="px-3 py-2 mb-1 text-[11px] text-muted-foreground truncate">{user.email}</div>
          <Link
            to="/"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/10"
          >
            <ArrowRight size={16} /> العودة للتطبيق
          </Link>
          <button
            onClick={() => signOut().then(() => nav({ to: "/" }))}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut size={16} /> خروج
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-6">
        <Outlet />
      </main>
    </div>
  );
}