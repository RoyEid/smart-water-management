import {
  BarChart3,
  Bell,
  Cpu,
  History,
  LayoutDashboard,
  Radio,
  Settings,
  Sliders,
  Waves,
  Zap,
} from "lucide-react";

/**
 * The single navigation definition, consumed by the sidebar, the mobile drawer
 * and the page-title lookup in the layout header. One source means a route can
 * never appear in the sidebar without a title, or vice versa.
 */

export const ACTIVE_NAV_ITEMS = [
  { to: "/dashboard", labelKey: "dashboard", titleKey: "dashboardOverview", icon: LayoutDashboard },
  { to: "/pump-control", labelKey: "pumpControl", titleKey: "remotePumpControl", icon: Sliders },
  { to: "/live-monitoring", labelKey: "liveMonitoring", titleKey: "liveSensorTelemetry", icon: Radio },
  { to: "/water-flow", labelKey: "waterFlow", titleKey: "waterFlow", icon: Waves },
  { to: "/electricity", labelKey: "electricity", titleKey: "electricitySource", icon: Zap },
  { to: "/history", labelKey: "history", titleKey: "telemetryHistory", icon: History },
  { to: "/analytics", labelKey: "analytics", titleKey: "telemetryAnalytics", icon: BarChart3 },
  { to: "/alerts", labelKey: "alerts", titleKey: "alerts", icon: Bell },
  { to: "/devices", labelKey: "devices", titleKey: "devices", icon: Cpu },
  { to: "/settings", labelKey: "settings", titleKey: "accountSettings", icon: Settings },
];

/**
 * Modules that are deliberately not built yet.
 *
 * These render as inert labels with a "Soon" badge — no route, no click
 * handler, no mock screen.
 */
export const FUTURE_NAV_ITEMS = [];

/**
 * Maps a pathname to its header title key. Longest match wins.
 */
export function resolveTitleKey(pathname) {
  const match = ACTIVE_NAV_ITEMS.filter((item) =>
    pathname === item.to || pathname.startsWith(`${item.to}/`)
  ).sort((a, b) => b.to.length - a.to.length)[0];

  return match?.titleKey ?? "dashboardOverview";
}
