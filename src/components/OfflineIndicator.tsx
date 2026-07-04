import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Subtle banner shown when the device is offline.
 * Pairs with the offline-first outbox: mutations are queued and flushed automatically.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div
      dir="rtl"
      className="fixed left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 rounded-full bg-amber-600/90 text-white text-xs px-3 py-1.5 shadow-lg backdrop-blur"
      style={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>وضع عدم الاتصال — تقدّمك محفوظ ويتم مزامنته تلقائياً</span>
    </div>
  );
}
