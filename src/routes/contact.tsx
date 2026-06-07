import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "دَاوِمْ — تواصل معنا" },
      { name: "description", content: "نتلقى ملاحظاتك وأفكارك بكل ترحاب." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };
  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="max-w-[460px] mx-auto px-5 pt-5 pb-10">
        <header className="grid grid-cols-3 items-center mb-5">
          <Link
            to="/"
            className="justify-self-start w-10 h-10 rounded-full flex items-center justify-center border border-border bg-card"
            aria-label="رجوع"
          >
            <ArrowRight size={18} />
          </Link>
          <h1 className="font-logo text-2xl text-primary text-center">دَاوِمْ</h1>
          <span />
        </header>

        <h2 className="text-xl font-bold mb-1">تواصل معنا</h2>
        <p className="text-sm text-muted-foreground mb-5">
          رأيك يهمنا، وسنرد عليك في أقرب وقت بإذن الله.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <a
            href="mailto:hello@dawm.app"
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card text-foreground"
          >
            <Mail className="text-primary" size={20} />
            <span className="text-xs">البريد</span>
          </a>
          <a
            href="https://wa.me/0"
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card text-foreground"
          >
            <MessageCircle className="text-primary" size={20} />
            <span className="text-xs">واتساب</span>
          </a>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <input
            required
            placeholder="الاسم"
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-foreground"
          />
          <input
            required
            type="email"
            placeholder="البريد الإلكتروني"
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-foreground"
          />
          <textarea
            required
            rows={4}
            placeholder="رسالتك..."
            className="w-full p-3 rounded-xl bg-muted border border-border text-foreground resize-none"
          />
          <button
            type="submit"
            className="w-full h-12 rounded-2xl text-primary-foreground font-bold flex items-center justify-center gap-2"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <Send size={16} />
            إرسال
          </button>
          {sent && (
            <p className="text-center text-xs text-primary">
              ✓ تم الإرسال، شكراً لك
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
