import { createContext, useContext } from "react";

export const LANG_KEY = "smart_water_language";

export const LANGUAGES = [
  { id: "en", labelKey: "english", dir: "ltr" },
  { id: "ar", labelKey: "arabic", dir: "rtl" },
  { id: "fr", labelKey: "french", dir: "ltr" },
  { id: "zh", labelKey: "chinese", dir: "ltr" },
];

export const LANGUAGE_IDS = LANGUAGES.map((language) => language.id);

export const LanguageContext = createContext(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function directionFor(language) {
  return language === "ar" ? "rtl" : "ltr";
}

export function readStoredLanguage() {
  const stored = localStorage.getItem(LANG_KEY);
  return LANGUAGE_IDS.includes(stored) ? stored : "en";
}

/**
 * Sets `lang` and `dir` on <html>.
 *
 * `dir` is what makes Arabic lay out right-to-left, and `lang` is what tells
 * assistive technology which language to pronounce — both are required, and
 * setting only the CSS direction would leave screen readers reading Arabic
 * with an English voice.
 */
export function applyLanguageToDocument(language) {
  const root = document.documentElement;
  const dir = directionFor(language);
  root.lang = language;
  root.dir = dir;
  return dir;
}
