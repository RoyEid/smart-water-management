import { useState } from "react";
import { CheckCircle2, Globe, LoaderCircle, Monitor, Moon, Palette, Sun } from "lucide-react";
import SettingsCard from "./SettingsCard";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";

const THEMES = [
  { id: "system", labelKey: "system", icon: Monitor },
  { id: "light", labelKey: "light", icon: Sun },
  { id: "dark", labelKey: "dark", icon: Moon },
];

const LANGUAGES = [
  { id: "en", labelKey: "english" },
  { id: "ar", labelKey: "arabic" },
  { id: "fr", labelKey: "french" },
];

/**
 * Theme and language.
 *
 * Both apply instantly (they are context state) and are then persisted twice:
 * to localStorage for the next first paint in this browser, and to the account
 * so they follow the user elsewhere. If the account save fails the local
 * preference is kept — the change the user made is not silently reverted — and
 * the failure is reported honestly rather than claimed as saved.
 */
export default function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { applyUser } = useAuth();
  const toast = useToast();
  const [savingKey, setSavingKey] = useState(null);

  const persist = async (payload, key) => {
    setSavingKey(key);
    try {
      const res = await api.patch("/auth/preferences", payload);
      applyUser(res.data.user);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("preferenceSyncFailed")));
    } finally {
      setSavingKey(null);
    }
  };

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    persist({ theme: nextTheme }, "theme");
  };

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    persist({ language: nextLanguage }, "language");
  };

  const optionClasses = (active) =>
    `flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-900/30 ${
      active
        ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
    }`;

  return (
    <SettingsCard
      title={t("preferences")}
      description={t("customizeExperience")}
      icon={Palette}
    >
      {/* Theme */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            {t("theme")}
          </p>
          {savingKey === "theme" && (
            <LoaderCircle size={12} className="animate-spin text-slate-400" aria-hidden="true" />
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {THEMES.map((option) => {
            const Icon = option.icon;
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleThemeChange(option.id)}
                className={optionClasses(active)}
              >
                <Icon size={20} aria-hidden="true" />
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Globe size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            {t("language")}
          </p>
          {savingKey === "language" && (
            <LoaderCircle size={12} className="animate-spin text-slate-400" aria-hidden="true" />
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {LANGUAGES.map((option) => {
            const active = language === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleLanguageChange(option.id)}
                className={`rounded-xl border p-2.5 text-xs font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-900/30 ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                }`}
              >
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-[11px] font-semibold text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span>{t("preferencesPersistNote")}</span>
        </div>
      </div>
    </SettingsCard>
  );
}
