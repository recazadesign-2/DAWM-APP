import { useEffect, useState } from "react";
import dawmLogoFull from "@/assets/dawm-logo-full.png";

/**
 * Splash screen shown on initial app load.
 * Fades in the Dawm logo then fades out before revealing the app.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), 1400);
    const doneTimer = setTimeout(onDone, 1900);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
        }}
      />
      <img
        src={dawmLogoFull}
        alt="دَاوِمْ"
        className="relative w-72 h-72 sm:w-80 sm:h-80 object-contain dawm-splash-logo drop-shadow-[0_6px_22px_rgba(0,0,0,0.35)]"
      />
    </div>
  );
}
