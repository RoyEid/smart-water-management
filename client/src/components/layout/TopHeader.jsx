import { Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import { useLanguage } from "../../context/LanguageContext";

export default function TopHeader({
  pageTitle = "Dashboard",
  deviceId = "tank-01",
  isOnline = false,
  onOpenMobileMenu,
}) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 shadow-xs backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        {/* min-w-0 on both sides so a long page title truncates instead of
            pushing the controls off a narrow screen. */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label={t("openMenu")}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-xl dark:text-slate-100">
              {pageTitle}
            </h1>
            <DeviceStatusLine deviceId={deviceId} isOnline={isOnline} className="sm:hidden" />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <DeviceStatusLine
            deviceId={deviceId}
            isOnline={isOnline}
            className="hidden sm:flex"
            emphasised
          />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/**
 * The device identity and its live state.
 *
 * aria-live announces the online/offline transition, because a device going
 * silent is exactly the change a user must not have to notice visually.
 */
function DeviceStatusLine({ deviceId, isOnline, className = "", emphasised = false }) {
  const { t } = useLanguage();

  return (
    <div
      className={`items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 ${
        className.includes("hidden") ? className : `flex ${className}`
      }`}
    >
      <span
        className={`rounded-md bg-blue-50 px-1.5 py-0.5 font-mono font-extrabold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/80 dark:text-cyan-400 dark:ring-blue-900/60 ${
          emphasised ? "px-2 text-[11px]" : "text-[10px]"
        }`}
      >
        {deviceId}
      </span>
      <span
        className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
        aria-live="polite"
      >
        <span
          className={`rounded-full ${emphasised ? "size-2" : "size-1.5"} ${
            isOnline ? "animate-pulse bg-emerald-500" : "bg-slate-400"
          }`}
          aria-hidden="true"
        />
        {isOnline ? t("deviceOnline") : t("deviceOffline")}
      </span>
    </div>
  );
}
