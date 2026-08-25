import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isPremium: boolean;
  roleChecked: boolean;
  loading: boolean;
  isGuest: boolean;
  /** TEMPORARY: full-access test mode (remove later). */
  isTestMode: boolean;
  termsAccepted: boolean;
  acceptTerms: () => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  enterTestMode: () => void;
  exitTestMode: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

const TERMS_KEY = "dawm:terms_accepted";
const GUEST_KEY = "dawm:guest_mode";
export const ADMIN_EMAIL = "eng.moh.ali21@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTermsAccepted(localStorage.getItem(TERMS_KEY) === "1");
    setIsGuest(localStorage.getItem(GUEST_KEY) === "1");
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Logging in exits guest mode automatically
        if (typeof window !== "undefined") localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
        setRoleChecked(false);
        setTimeout(() => checkAdmin(s.user.id), 0);
      } else {
        setIsAdmin(false);
        setIsPremium(false);
        setRoleChecked(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }: any) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) checkAdmin(s.user.id).finally(() => setLoading(false));
      else { setRoleChecked(true); setLoading(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const checkAdmin = async (uid: string) => {
    const email = (await supabase.auth.getUser()).data.user?.email;
    const emailIsAdmin = email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    setIsAdmin(!!emailIsAdmin);

    // Premium activation: admin email always premium, plus any email in premium_emails table.
    const { data: premiumRpc, error: premErr } = await supabase.rpc("is_current_user_premium");
    if (premErr) console.error("[isPremium]", premErr);
    setIsPremium(!!emailIsAdmin || !!premiumRpc);

    setRoleChecked(true);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirect = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirect, data: displayName ? { display_name: displayName } : {} },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  };

  const acceptTerms = () => {
    if (typeof window !== "undefined") localStorage.setItem(TERMS_KEY, "1");
    setTermsAccepted(true);
  };
  const enterGuestMode = () => {
    if (typeof window !== "undefined") localStorage.setItem(GUEST_KEY, "1");
    setIsGuest(true);
  };
  const exitGuestMode = () => {
    if (typeof window !== "undefined") localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  };

  return (
    <Ctx.Provider value={{ session, user, isAdmin, isPremium, roleChecked, loading, isGuest, termsAccepted, acceptTerms, enterGuestMode, exitGuestMode, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};