import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Droplets,
  History,
  LayoutDashboard,
  Radio,
  Settings,
  Sliders,
  Waves,
  X,
} from "lucide-react";
import ComingSoonBadge from "./ComingSoonBadge";
import { useLanguage } from "../../context/LanguageContext";

export default function Sidebar({
  activeTab = "dashboard",
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onShowToast,
}) {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const activeItems = [
    { id: "dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    { id: "pump-control", labelKey: "pumpControl", icon: Sliders },
    { id: "live-monitoring", labelKey: "liveMonitoring", icon: Radio },
    { id: "water-flow", labelKey: "waterFlow", icon: Waves },
    { id: "settings", labelKey: "settings", icon: Settings },
  ];

  const futureItems = [
    { id: "history", labelKey: "history", icon: History },
    { id: "analytics", labelKey: "analytics", icon: BarChart3 },
    { id: "alerts", labelKey: "alerts", icon: Bell },
    { id: "devices", labelKey: "devices", icon: Cpu },
  ];

  const handleItemClick = (item, isStatic = false) => {
    const translatedLabel = t(item.labelKey);
    if (isStatic) {
      if (onShowToast) {
        onShowToast(`${translatedLabel} ${t("soonText")}`);
      }
      return;
    }

    if (onSelectTab) {
      onSelectTab(item.id);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const CollapseIcon = isRtl
    ? isCollapsed
      ? ChevronLeft
      : ChevronRight
    : isCollapsed
    ? ChevronRight
    : ChevronLeft;

  return (
    <>
      {/* Mobile Dark Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 ${
          isRtl ? "right-0 border-l" : "left-0 border-r"
        } z-50 flex flex-col border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-[#0B132B] dark:text-slate-200 shadow-2xl transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen
            ? "translate-x-0"
            : isRtl
            ? "translate-x-full lg:translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 px-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-blue-500/20">
              <Droplets size={22} aria-hidden="true" />
            </span>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="block truncate text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {t("smartWater")}
                </span>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                  {t("iotPlatform")}
                </span>
              </div>
            )}
          </div>

          {/* Close button for Mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {/* Active Services Group */}
          <div>
            {!isCollapsed && (
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                {t("activeOperations")}
              </p>
            )}
            <nav className="space-y-1">
              {activeItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const label = t(item.labelKey);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item, false)}
                    title={isCollapsed ? label : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all duration-200 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-500"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                  >
                    {/* Active Indicator Strip */}
                    {isActive && (
                      <span
                        className={`absolute ${
                          isRtl ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
                        } inset-y-1.5 w-1 bg-cyan-400`}
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
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Future Modules Group */}
          <div>
            {!isCollapsed && (
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                {t("futureModules")}
              </p>
            )}
            <nav className="space-y-1">
              {futureItems.map((item) => {
                const Icon = item.icon;
                const label = t(item.labelKey);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item, true)}
                    title={isCollapsed ? `${label} (${t("comingSoon")})` : undefined}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400/80 transition hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-300 ${
                      isCollapsed ? "justify-center px-0" : ""
                    }`}
                  >
                    <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                      <Icon
                        size={17}
                        className="shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        aria-hidden="true"
                      />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </div>
                    <ComingSoonBadge collapsed={isCollapsed} />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Desktop Collapse / Expand Footer Toggle */}
        <div className="hidden border-t border-slate-200/80 dark:border-slate-800/80 p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          >
            <CollapseIcon size={18} aria-hidden="true" />
            {!isCollapsed && <span>{t("collapseSidebar")}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
