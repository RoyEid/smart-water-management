import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "../locales/translations";

const LANG_KEY = "smart_water_language";

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  dir: "ltr",
});

function applyLanguageAttributes(lang) {
  const root = document.documentElement;
  const isRtl = lang === "ar";
  root.lang = lang;
  root.dir = isRtl ? "rtl" : "ltr";
  return isRtl ? "rtl" : "ltr";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem(LANG_KEY) || "en";
  });

  const [dir, setDir] = useState(() => applyLanguageAttributes(language));

  const setLanguage = (newLang) => {
    setLanguageState(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  };

  useEffect(() => {
    const currentDir = applyLanguageAttributes(language);
    setDir(currentDir);
  }, [language]);

  const t = (key, params = {}) => {
    const dict = translations[language] || translations.en;
    let text = dict[key] || translations.en[key] || key;

    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`{${paramKey}}`, "g"), params[paramKey]);
    });

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
