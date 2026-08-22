import { createContext, useContext } from "react";

export const THEME_KEY = "smart_water_theme";
export const THEME_OPTIONS = ["light", "dark", "system"];

/**
 * Context and hook live in a plain module, separate from the provider
 * component, so the provider file exports only components — which is what
 * react-refresh needs to hot-reload it reliably.
 */
export const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Applies the resolved theme to the document.
 *
 * `colorScheme` is set alongside the class so native form controls and
 * scrollbars follow the theme too, not just the Tailwind-styled surfaces.
 */
export function applyThemeToDocument(isDark) {
  const root = document.documentElement;
  root.classList.toggle("dark", Boolean(isDark));
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function readStoredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return stored && THEME_OPTIONS.includes(stored) ? stored : "light";
}

export function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export function resolveIsDark(theme, prefersDark) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (theme === "system") return Boolean(prefersDark);
  return false;
}
