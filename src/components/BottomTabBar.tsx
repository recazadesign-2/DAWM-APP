import { Home, BookOpen, BarChart2, Settings as SettingsIcon, Shield, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface TabDef {
  to: string;
  title: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { to: "/", title: "الرئيسية", icon: Home },
  { to: "/dhikr", title: "الأذكار", icon: BookOpen },
  { to: "/stats", title: "الإحصائيات", icon: BarChart2 },
  { to: "/settings", title: "الإعدادات", icon: SettingsIcon },
];

function TabLink({ tab, pathname }: { tab: TabDef; pathname: string }) {
  const isActive = pathname === tab.to;
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      className={cn(
        "flex items-center justify-center h-11 rounded-full transition-all",
        isActive
          ? "px-4 gap-2"
          : "w-11 text-muted-foreground hover:text-foreground",
      )}
      style={
        isActive
          ? {
              background: "color-mix(in oklab, var(--accent) 22%, transparent)",
              color: "var(--accent)",
            }
          : undefined
      }
    >
      <Icon
        size={20}
        strokeWidth={isActive ? 2.4 : 2}
        className={isActive ? "dawm-nav-active-icon" : ""}
      />
      {isActive && (
        <span className="text-sm font-semibold whitespace-nowrap">{tab.title}</span>
      )}
    </Link>
  );
}

export function BottomTabBar() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="pointer-events-auto relative flex flex-row items-center justify-around gap-1 px-2 py-2 rounded-full border border-border bg-card/90 backdrop-blur-xl w-full max-w-[420px]"
        style={{ boxShadow: "var(--shadow-elegant)" }}
      >
        {left.map((t) => (
          <TabLink key={t.to} tab={t} pathname={location.pathname} />
        ))}

        {isAdmin ? (
          <Link
            to="/admin"
            aria-label="لوحة الإدارة"
            className="-mt-7 w-14 h-14 rounded-full flex items-center justify-center text-primary-foreground shrink-0 ring-4 ring-background"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Shield size={22} />
          </Link>
        ) : (
          <span aria-hidden className="w-1" />
        )}

        {right.map((t) => (
          <TabLink key={t.to} tab={t} pathname={location.pathname} />
        ))}
      </div>
    </nav>
  );
}