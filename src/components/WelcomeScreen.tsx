import { Link } from "@tanstack/react-router";
import { LogIn, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import dawmLogoFull from "@/assets/dawm-logo-full.png";

export function WelcomeScreen() {
  const { enterGuestMode, enterTestMode } = useAuth();
  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground flex items-center justify-center px-5">
      <div className="w-full max-w-[420px] text-center">
        <img
          src={dawmLogoFull}
          alt="دَاوِمْ"
          className="w-44 h-44 mx-auto object-contain mb-4 drop-shadow-[0_6px_20px_rgba(0,0,0,0.25)] dawm-splash-logo"
        />
        <p className="font-quran text-primary text-lg mb-1">﴿ فَاسْتَقِمْ كَمَا أُمِرْتَ ﴾</p>
        <p className="text-sm text-muted-foreground mb-10">
          رفيقك اليومي للورد القرآني والأذكار.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
          <Link
            to="/auth"
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-primary-foreground font-bold"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <LogIn size={18} /> تسجيل الدخول / إنشاء حساب
          </Link>
          {/* TEMPORARY: full-access test mode — safe to delete later */}
          <button
            onClick={enterTestMode}
            title="وضع الاختبار"
            className="shrink-0 px-4 py-4 rounded-2xl border border-dashed border-primary/60 text-primary text-xs font-bold hover:bg-primary/10 transition"
          >
            <FlaskConical size={18} className="mx-auto mb-1" />
            اختبار
          </button>
          </div>
          <button
            onClick={enterGuestMode}
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl border border-border bg-card text-foreground hover:bg-muted/40 transition"
          >
            <UserCircle2 size={18} /> متابعة كضيف
          </button>
          <p className="text-[11px] text-muted-foreground mt-3 leading-6">
            في وضع الضيف يمكنك قراءة القرآن والأذكار فقط. التسجيل يفعّل تتبع العادات والنقاط والمستويات.
          </p>
        </div>
      </div>
    </main>
  );
}
