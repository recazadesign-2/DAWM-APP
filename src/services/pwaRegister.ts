// Safe service worker registration.
// - Refuses to register in Lovable preview, iframe, dev, or when ?sw=off is present.
// - In refused contexts, unregisters any matching /sw.js registration to avoid stale caches.

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

function inIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.top !== window.self;
  } catch {
    return true;
  }
}

function killSwitchActive(): boolean {
  if (typeof window === "undefined") return false;
  return new URL(window.location.href).searchParams.get("sw") === "off";
}

async function unregisterAll() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => (r.active?.scriptURL || "").endsWith("/sw.js"))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export async function registerPwa(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isDev = !import.meta.env.PROD;
  if (isDev || inIframe() || isPreviewHost() || killSwitchActive()) {
    await unregisterAll();
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    // Auto-activate updates
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          nw.postMessage("skipWaiting");
        }
      });
    });
  } catch {
    /* ignore */
  }
}
