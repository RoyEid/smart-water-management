import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Droplets, X } from "lucide-react";
import ComingSoonBadge from "./ComingSoonBadge";
import {
  ACTIVE_NAV_ITEMS,
  FUTURE_NAV_ITEMS,
} from "./navigation";
import { useLanguage } from "../../context/LanguageContext";

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isMobileOpen) return undefined;

    // The drawer is a modal surface on mobile: focus moves into it and Escape
    // closes it, so it is operable without a pointer.
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMobile?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // The page behind must not scroll while the drawer covers it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen, onCloseMobile]);

  const CollapseIcon = isRtl
    ? isCollapsed
      ? ChevronLeft
      : ChevronRight
    : isCollapsed
    ? ChevronRight
    : ChevronLeft;

  const navItems = ACTIVE_NAV_ITEMS;

  const linkClasses = ({ isActive }) =>
    `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      isActive
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-500"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
    } ${isCollapsed ? "justify-center px-0" : ""}`;

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t("mainNavigation")}
        className={`fixed inset-y-0 ${
          isRtl ? "right-0 border-l" : "left-0 border-r"
        } z-50 flex flex-col border-slate-200 bg-white text-slate-800 shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-[#0B132B] dark:text-slate-200 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen
            ? "translate-x-0"
            : isRtl
            ? "translate-x-full lg:translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-4 dark:border-slate-800/80">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-blue-500/20">
              <Droplets size={22} aria-hidden="true" />
            </span>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="block truncate text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {t("smartWater")}
                </span>
                <span className="block truncate text-[10px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                  {t("iotPlatform")}
                </span>
              </div>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCloseMobile}
            className="shrink-0 rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={t("closeMenu")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const label = t(item.labelKey);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    // Navigating on mobile must dismiss the drawer, otherwise
                    // the new page is hidden behind the menu that opened it.
                    onClick={onCloseMobile}
                    className={linkClasses}
                    title={isCollapsed ? label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className={`absolute ${
                              isRtl ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
                            } inset-y-1.5 w-1 bg-cyan-400`}
                            aria-hidden="true"
                          />
                        )}
                        <Icon
                          size={18}
                          className={`shrink-0 transition ${
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-blue-600 dark:group-hover:text-cyan-400"
                          }`}
                          aria-hidden="true"
                        />
                        {isCollapsed ? (
                          // The collapsed rail still needs an accessible name.
                          <span className="sr-only">{label}</span>
                        ) : (
                          <span className="truncate">{label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {FUTURE_NAV_ITEMS.length > 0 && (
            <div>
              {!isCollapsed && (
                <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t("futureModules")}
                </p>
              )}
              <ul className="space-y-1">
                {FUTURE_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const label = t(item.labelKey);
                  return (
                    <li
                      key={item.id}
                      title={isCollapsed ? `${label} — ${t("comingSoon")}` : undefined}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 ${
                        isCollapsed ? "justify-center px-0" : ""
                      }`}
                    >
                      <div
                        className={`flex min-w-0 items-center gap-3 ${
                          isCollapsed ? "justify-center" : ""
                        }`}
                      >
                        <Icon size={17} className="shrink-0" aria-hidden="true" />
                        {!isCollapsed && <span className="truncate">{label}</span>}
                      </div>
                      <ComingSoonBadge collapsed={isCollapsed} label={t("comingSoon")} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="hidden border-t border-slate-200/80 p-3 lg:block dark:border-slate-800/80">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <CollapseIcon size={18} aria-hidden="true" />
            {isCollapsed ? (
              <span className="sr-only">{t("expandSidebar")}</span>
            ) : (
              <span>{t("collapseSidebar")}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
