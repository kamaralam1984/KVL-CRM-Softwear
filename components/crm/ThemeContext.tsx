"use client";
// Shared dark/light theme state — persisted to the same "kvl_theme"
// localStorage key app/page.tsx already used ad-hoc. Previously only
// app/page.tsx (which drives the .dark/.light className) and TopNav (via
// props from app/page.tsx) could read/change it; components rendered
// through the generic sectionMap (e.g. Settings' own theme toggle) had no
// way to reach it and fell back to a disconnected local useState that never
// affected the real theme. Any component can now call useTheme() directly.

import { createContext, useContext, useState, type ReactNode } from "react";

const THEME_KEY = "kvl_theme";

interface ThemeContextValue {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === "dark" : true;
  } catch {
    return true;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(readInitialTheme);

  function setDarkMode(value: boolean) {
    setDarkModeState(value);
    try {
      localStorage.setItem(THEME_KEY, value ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  function toggleDark() {
    setDarkMode(!darkMode);
  }

  return <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() must be used within a <ThemeProvider>");
  return ctx;
}
