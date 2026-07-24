import { LogOut, Menu } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function TopHeader({
  pageTitle = "Dashboard",
  isOnline = false,
  onOpenMobileMenu,
  logout,
  loggingOut = false,
}) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 dark:border-slate-800/80 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left Section: Mobile Menu Trigger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open mobile menu"
            className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:hidden">
              <span className="rounded bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:text-cyan-400">
                tank-01
              </span>
              <span className="inline-flex items-center gap-1">
                <span
                  className={`size-1.5 rounded-full ${
                    isOnline ? "animate-pulse bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {isOnline ? t("telemetryLive") : t("awaitingData")}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Device Status Tag & Logout Button */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:flex">
            <span className="rounded-md bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 font-mono text-[11px] font-extrabold text-blue-700 dark:text-cyan-400 ring-1 ring-blue-100 dark:ring-blue-900/60">
              tank-01
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span
                className={`size-2 rounded-full ${
                  isOnline ? "animate-pulse bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {isOnline ? t("telemetryLive") : t("awaitingData")}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-label={t("logout")}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={15} aria-hidden="true" />
            <span className="hidden sm:inline">
              {loggingOut ? t("loggingOut") : t("logout")}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
