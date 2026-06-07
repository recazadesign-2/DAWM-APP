import { useAuth } from "@/contexts/AuthContext";
import { TermsScreen } from "./TermsScreen";
import { WelcomeScreen } from "./WelcomeScreen";
import { SplashScreen } from "./SplashScreen";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

/**
 * Blocks app access until:
 *  1. The splash screen has finished its initial fade-in/out.
 *  2. The user has accepted the Terms of Service.
 *  3. The user has either signed in OR explicitly chosen guest mode.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { termsAccepted, user, isGuest, loading } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isAuthRoute = path.startsWith("/auth");

  const [splashDone, setSplashDone] = useState(false);
  // Show splash only once per browser session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("dawm:splash-shown") === "1") {
      setSplashDone(true);
    }
  }, []);

  if (loading) return null;
  if (!splashDone) {
    return (
      <SplashScreen
        onDone={() => {
          try { sessionStorage.setItem("dawm:splash-shown", "1"); } catch {}
          setSplashDone(true);
        }}
      />
    );
  }
  if (!termsAccepted && !isAuthRoute) return <TermsScreen />;
  if (!user && !isGuest && !isAuthRoute) return <WelcomeScreen />;
  return <>{children}</>;
}