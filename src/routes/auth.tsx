import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — دَاوِمْ" },
      { name: "description", content: "سجّل دخولك لإدارة محتوى دَاوِمْ." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, displayName);
    setBusy(false);
    if (error) setError(error);
    else if (mode === "signup") setError("تم إرسال رابط التحقق إلى بريدك الإلكتروني.");
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      setError(result.error.message || "تعذر تسجيل الدخول عبر جوجل");
    }
  };

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <h1 className="font-logo text-3xl text-primary text-center mb-1">دَاوِمْ</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full rounded-lg border border-border bg-background py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-60 mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41 36.9 44 31 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          الدخول عبر جوجل
        </button>

        <div className="flex items-center gap-2 my-3">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">أو</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="الاسم"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          )}
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === "signin" ? "دخول" : "إنشاء"}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          className="w-full text-xs text-muted-foreground mt-4 hover:text-foreground"
        >
          {mode === "signin" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل دخول"}
        </button>
        <Link to="/" className="block text-center text-xs text-muted-foreground mt-3 hover:text-foreground">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}