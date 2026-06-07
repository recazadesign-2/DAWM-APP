import { Link } from "@tanstack/react-router";
import { Lock, LogIn } from "lucide-react";

export function GuestLockCard({
  title = "ميزة للمسجّلين فقط",
  description = "سجّل الدخول لتفعيل تتبع العادات والنقاط والمستويات.",
}: { title?: string; description?: string }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div
        className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
        style={{ background: "color-mix(in oklab, var(--muted) 60%, transparent)" }}
      >
        <Lock size={20} className="text-muted-foreground" />
      </div>
      <h3 className="text-sm font-bold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-6">{description}</p>
      <Link
        to="/auth"
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-primary-foreground text-sm font-bold"
        style={{ background: "var(--gradient-primary)" }}
      >
        <LogIn size={14} /> تسجيل الدخول
      </Link>
    </div>
  );
}