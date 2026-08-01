import {
  BarChart3,
  Bell,
  Cpu,
  History,
  LayoutDashboard,
  Plug,
  Radio,
  Settings,
  Shield,
  Sliders,
  Waves,
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
  { to: "/history", labelKey: "history", titleKey: "telemetryHistory", icon: History },
  { to: "/alerts", labelKey: "alerts", titleKey: "alerts", icon: Bell },
  { to: "/devices", labelKey: "devices", titleKey: "devices", icon: Cpu },
  { to: "/settings", labelKey: "settings", titleKey: "accountSettings", icon: Settings },
];

// Rendered only for administrators. The sidebar hiding it is a convenience —
// the server refuses the underlying routes regardless of what the UI shows.
export const ADMIN_NAV_ITEM = {
  to: "/admin",
  labelKey: "adminDashboard",
  titleKey: "adminDashboard",
  icon: Shield,
};

export const ADMIN_SUB_NAV = [
  { to: "/admin", labelKey: "adminOverview", end: true },
  { to: "/admin/users", labelKey: "adminUsers" },
  { to: "/admin/devices", labelKey: "adminDevices" },
  { to: "/admin/telemetry", labelKey: "adminTelemetry" },
  { to: "/admin/activity", labelKey: "adminActivity" },
  { to: "/admin/config", labelKey: "adminConfig" },
];

/**
 * Modules that are deliberately not built yet.
 *
 * These render as inert labels with a "Soon" badge — no route, no click
 * handler, no mock screen. Electricity-source monitoring in particular must
 * not ship a functional-looking UI backed by nothing.
 */
export const FUTURE_NAV_ITEMS = [
  { id: "electricity", labelKey: "electricitySource", icon: Plug },
  { id: "analytics", labelKey: "analytics", icon: BarChart3 },
];

/**
 * Maps a pathname to its header title key. Longest match wins so
 * /admin/users resolves to the admin title rather than falling through.
 */
export function resolveTitleKey(pathname, { isAdmin } = {}) {
  if (pathname.startsWith("/admin")) {
    return isAdmin ? ADMIN_NAV_ITEM.titleKey : "dashboardOverview";
  }

  const match = ACTIVE_NAV_ITEMS.filter((item) =>
    pathname === item.to || pathname.startsWith(`${item.to}/`)
  ).sort((a, b) => b.to.length - a.to.length)[0];

  return match?.titleKey ?? "dashboardOverview";
}
