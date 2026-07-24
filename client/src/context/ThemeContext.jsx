import { createContext, useContext, useEffect, useState } from "react";

const THEME_KEY = "smart_water_theme";

const ThemeContext = createContext({
  theme: "system",
  setTheme: () => {},
  isDark: false,
});

function applyTheme(theme) {
  const root = document.documentElement;
  let isDark = false;

  if (theme === "dark") {
    isDark = true;
  } else if (theme === "light") {
    isDark = false;
  } else {
    // system
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  return isDark;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(THEME_KEY) || "system";
  });

  const [isDark, setIsDark] = useState(() => applyTheme(theme));

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  useEffect(() => {
    const currentIsDark = applyTheme(theme);
    setIsDark(currentIsDark);

    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const updatedIsDark = applyTheme("system");
      setIsDark(updatedIsDark);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
