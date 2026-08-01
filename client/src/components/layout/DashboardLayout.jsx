import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { resolveTitleKey } from "./navigation";
import useTankData from "../../hooks/useTankData";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { TelemetryContext } from "../../context/TelemetryContext";

const COLLAPSED_KEY = "smart_water_sidebar_collapsed";

/**
 * Chrome shared by every signed-in page.
 *
 * Telemetry is subscribed to once here and passed down through context, so
 * navigating between Dashboard, Pump Control and Live Monitoring does not tear
 * down and rebuild the socket subscription on every route change — and every
 * page shows the same reading at the same moment.
 */
export default function DashboardLayout() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { t, dir } = useLanguage();
  const telemetry = useTankData();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });
  // The drawer records the route it was opened on. Any navigation — a link, or
  // the browser's back button — makes the recorded path differ from the current
  // one, which closes the drawer as a derived value. Doing this in state rather
  // than an effect means the drawer is never briefly open on the new page.
  const [drawer, setDrawer] = useState({ open: false, path: location.pathname });
  const isMobileOpen = drawer.open && drawer.path === location.pathname;

  const isRtl = dir === "rtl";

  const openMobileMenu = () =>
    setDrawer({ open: true, path: location.pathname });
  const closeMobileMenu = () =>
    setDrawer({ open: false, path: location.pathname });

  const toggleCollapse = () => {
    setIsCollapsed((current) => {
      const next = !current;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const pageTitle = t(resolveTitleKey(location.pathname, { isAdmin }));

  const desktopPadding = isCollapsed
    ? isRtl
      ? "lg:pr-20"
      : "lg:pl-20"
    : isRtl
    ? "lg:pr-64"
    : "lg:pl-64";

  return (
    <TelemetryContext.Provider value={telemetry}>
      {/* overflow-x-hidden is the backstop against a wide child (a table, a
          chart) forcing the whole page to scroll sideways on mobile. */}
      <div className="min-h-screen overflow-x-hidden bg-slate-50/60 text-slate-900 transition-colors duration-300 selection:bg-blue-600 selection:text-white dark:bg-slate-950 dark:text-slate-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
        >
          {t("skipToContent")}
        </a>

        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobileMenu}
        />

        <div className={`flex min-h-screen flex-col transition-all duration-300 ${desktopPadding}`}>
          <TopHeader
            pageTitle={pageTitle}
            deviceId={telemetry.reading?.deviceId || "tank-01"}
            isOnline={telemetry.isOnline}
            onOpenMobileMenu={openMobileMenu}
          />

          <main
            id="main-content"
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </TelemetryContext.Provider>
  );
}
