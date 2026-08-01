import { useState } from "react";
import {
  User,
  Lock,
  Link2,
  Palette,
  Bell,
  Trash2,
  LoaderCircle,
  ChevronDown,
  Check,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import ProfileSection from "../components/settings/ProfileSection";
import SecuritySection from "../components/settings/SecuritySection";
import ConnectedAccountsSection from "../components/settings/ConnectedAccountsSection";
import PreferencesSection from "../components/settings/PreferencesSection";
import NotificationsSection from "../components/settings/NotificationsSection";
import DangerZoneSection from "../components/settings/DangerZoneSection";

export default function SettingsPage() {
  const { t } = useLanguage();
  // The user already lives in AuthContext, loaded once at startup — this page
  // no longer issues its own /auth/me request, and an update made here is
  // immediately visible in the header and the profile menu.
  const { user, isLoading, logout, applyUser } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sections = [
    { id: "profile", labelKey: "profile", icon: User },
    { id: "security", labelKey: "security", icon: Lock },
    { id: "connected", labelKey: "connectedAccounts", icon: Link2 },
    { id: "preferences", labelKey: "preferences", icon: Palette },
    { id: "notifications", labelKey: "notifications", icon: Bell },
    { id: "danger", labelKey: "dangerZone", icon: Trash2, danger: true },
  ];

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <LoaderCircle
          size={28}
          className="animate-spin text-blue-600 dark:text-cyan-400"
          aria-hidden="true"
        />
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  }

  const handleUserUpdate = applyUser;

  const currentSection = sections.find((s) => s.id === activeSection) || sections[0];
  const CurrentSectionIcon = currentSection.icon;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
          {t("account")}
        </p>
        <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          {t("settings")}
        </h2>
      </div>

      {/* Main layout container */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Navigation Sidebar / Mobile Selector */}
        <nav className="shrink-0 lg:w-56">
          {/* Mobile Modern Label Selector */}
          <div className="space-y-3 lg:hidden">
            {/* Custom Interactive Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 text-xs font-bold shadow-sm shadow-slate-900/5 transition hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                      currentSection.danger
                        ? "bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                        : "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400"
                    }`}
                  >
                    <CurrentSectionIcon size={16} />
                  </span>
                  <span className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {t(currentSection.labelKey)}
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180 text-blue-600 dark:text-cyan-400" : ""
                  }`}
                />
              </button>

              {/* Custom Dropdown Menu Panel */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute left-0 right-0 top-14 z-30 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150">
                    {sections.map((s) => {
                      const Icon = s.icon;
                      const active = activeSection === s.id;
                      const label = t(s.labelKey);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setActiveSection(s.id);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                            active
                              ? s.danger
                                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-900/60"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 ring-1 ring-blue-200 dark:ring-blue-900/60"
                              : s.danger
                              ? "text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-400"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              size={16}
                              className={`shrink-0 ${
                                active
                                  ? s.danger
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-blue-600 dark:text-cyan-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            />
                            <span className="truncate">{label}</span>
                          </div>
                          {active && (
                            <Check
                              size={16}
                              className={`shrink-0 ${
                                s.danger ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-cyan-400"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Horizontal Scrollable Quick Pill Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {sections.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                const label = t(s.labelKey);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all duration-200 ${
                      active
                        ? s.danger
                          ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-1 ring-rose-500"
                          : "bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-1 ring-blue-500"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Vertical Tabs */}
          <div className="hidden space-y-1 lg:block">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              const label = t(s.labelKey);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                    active
                      ? s.danger
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900/60"
                        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/60 dark:text-cyan-300 dark:ring-blue-900/60"
                      : s.danger
                      ? "text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-400"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon
                    size={16}
                    className={`shrink-0 transition ${
                      active
                        ? s.danger
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-blue-600 dark:text-cyan-400"
                        : s.danger
                        ? "text-rose-400 group-hover:text-rose-500"
                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="min-w-0 flex-1">
          {activeSection === "profile" && (
            <ProfileSection user={user} onUserUpdate={handleUserUpdate} />
          )}
          {activeSection === "security" && (
            <SecuritySection user={user} logout={logout} />
          )}
          {activeSection === "connected" && (
            <ConnectedAccountsSection user={user} />
          )}
          {activeSection === "preferences" && <PreferencesSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "danger" && <DangerZoneSection user={user} />}
        </div>
      </div>
    </div>
  );
}
