import { useEffect, useState } from "react";

export type MushafMode = "interactive" | "paper";
const KEY = "dawm:reading:mushafMode";
const EVT = "mushaf-mode-changed";

export function getMushafMode(): MushafMode {
  if (typeof window === "undefined") return "interactive";
  return (localStorage.getItem(KEY) as MushafMode) || "interactive";
}

export function setMushafMode(mode: MushafMode) {
  try {
    localStorage.setItem(KEY, mode);
    window.dispatchEvent(new CustomEvent(EVT, { detail: mode }));
  } catch {
    /* ignore */
  }
}

export function useMushafMode(): [MushafMode, (m: MushafMode) => void] {
  const [mode, setMode] = useState<MushafMode>(() => getMushafMode());
  useEffect(() => {
    const onChange = (e: Event) => setMode((e as CustomEvent).detail as MushafMode);
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);
  return [mode, setMushafMode];
}
