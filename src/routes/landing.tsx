import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserPlus } from "lucide-react";
import logo from "@/assets/dawm-logo.png";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — وَاسْتَقِمْ كَمَا أُمِرْتَ" },
      { name: "description", content: "ابدأ رحلة الاستقامة مع تطبيق دَاوِمْ." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground flex items-center justify-center px-5">
      <div className="max-w-[420px] w-full text-center">
        <img src={logo} alt="DAWM" className="w-24 h-24 mx-auto rounded-3xl object-cover mb-6" />
        <h1 className="text-4xl font-bold font-display mb-2">دَاوِمْ</h1>
        <p className="text-primary font-quran text-lg mb-1">﴿ فَاسْتَقِمْ كَمَا أُمِرْتَ ﴾</p>
        <p className="text-sm text-muted-foreground mb-10">
          رفيقك اليومي للورد القرآني والأذكار والصلوات.
        </p>

        <div className="space-y-3">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-primary-foreground font-bold"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <UserPlus size={18} /> ابدأ الآن
          </Link>
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl border border-border text-muted-foreground hover:text-foreground"
          >
            دخول كضيف <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
