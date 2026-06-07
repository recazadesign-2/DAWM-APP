import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeId =
  | "night"
  | "day"
  | "paper"
  | "talia"
  | "ramadan"
  | "friday";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  english: string;
  description: string;
  bg: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
  isDark: boolean;
  /** Premium themes are locked for guest users and free users. */
  isPremium?: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "night",
    name: "الليل",
    english: "Night",
    description: "أسود عميق مع لمسات ذهبية وزمردية",
    bg: "#0F1115",
    surface: "#1E2128",
    primary: "#C5A059",
    accent: "#E5C46A",
    text: "#F2F5F3",
    isDark: true,
  },
  {
    id: "day",
    name: "النهار",
    english: "Day",
    description: "أبيض نقي بلمسات خضراء هادئة",
    bg: "#F7FAF8",
    surface: "#FFFFFF",
    primary: "#1F9D6B",
    accent: "#C99A3A",
    text: "#0F1A14",
    isDark: false,
  },
  {
    id: "paper",
    name: "الورقي",
    english: "Sepia",
    description: "بيج دافئ يحاكي الورق القديم",
    bg: "#F1E6D2",
    surface: "#E7D7BA",
    primary: "#8B5E34",
    accent: "#A8742E",
    text: "#3D2A18",
    isDark: false,
    isPremium: true,
  },
  {
    id: "talia",
    name: "تالية",
    english: "Talia",
    description: "وردي ناعم لقراءة لطيفة",
    bg: "#FFF1F4",
    surface: "#FFFFFF",
    primary: "#D6336C",
    accent: "#E879A0",
    text: "#3A1623",
    isDark: false,
    isPremium: true,
  },
  {
    id: "ramadan",
    name: "شهر رمضان",
    english: "Ramadan",
    description: "أخضر ليلي مع لمسات ذهبية",
    bg: "#0B2018",
    surface: "#143027",
    primary: "#E5C46A",
    accent: "#F5D98C",
    text: "#F0EAD2",
    isDark: true,
    isPremium: true,
  },
  {
    id: "friday",
    name: "الجمعة",
    english: "Friday",
    description: "ليلي بلمسات برتقالية دافئة",
    bg: "#0F1115",
    surface: "#1B1E25",
    primary: "#FF8A3D",
    accent: "#FFB36B",
    text: "#F4F1EC",
    isDark: true,
    isPremium: true,
  },
];

interface ThemeCtx {
  theme: ThemeId;
  meta: ThemeMeta;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

const STORAGE_KEY = "dawm:theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("night");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (stored && THEMES.some((t) => t.id === stored)) {
        setThemeState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    const meta = THEMES.find((t) => t.id === theme)!;
    if (meta.isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  const meta = THEMES.find((t) => t.id === theme)!;

  return (
    <ThemeContext.Provider value={{ theme, meta, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
