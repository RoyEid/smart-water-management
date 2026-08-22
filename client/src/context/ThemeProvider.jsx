import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyThemeToDocument,
  readStoredTheme,
  resolveIsDark,
  systemPrefersDark,
  ThemeContext,
  THEME_KEY,
} from "./ThemeContext";

/**
 * Owns theme selection and applies it to the document immediately.
 *
 * `isDark` is derived during render from (theme, prefersDark) rather than held
 * in its own state and synced by an effect.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  const isDark = resolveIsDark(theme, prefersDark);

  useEffect(() => {
    applyThemeToDocument(isDark);
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => setPrefersDark(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  const forceLight = useCallback(() => {
    setThemeState("light");
    localStorage.removeItem(THEME_KEY);
    applyThemeToDocument(false);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, forceLight, isDark }),
    [theme, setTheme, forceLight, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
