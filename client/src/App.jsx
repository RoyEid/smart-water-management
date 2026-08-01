import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AdminRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from "./components/routing/RouteGuards";
import DashboardLayout from "./components/layout/DashboardLayout";
import { LoadingState } from "./components/ui/StateViews";

import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyCodePage from "./pages/VerifyCodePage";

import DashboardPage from "./pages/DashboardPage";
import PumpControlPage from "./pages/PumpControlPage";
import LiveMonitoringPage from "./pages/LiveMonitoringPage";
import WaterFlowPage from "./pages/WaterFlowPage";
import HistoryPage from "./pages/HistoryPage";
import AlertsPage from "./pages/AlertsPage";
import DevicesPage from "./pages/DevicesPage";
import DeviceDetailPage from "./pages/DeviceDetailPage";
import SettingsPage from "./pages/SettingsPage";

// The admin area is loaded on demand. Most sessions are ordinary users who
// never open it, and the server refuses its endpoints for them anyway — so
// shipping it in the initial bundle would be dead weight on every page load.
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverviewPage = lazy(() => import("./pages/admin/AdminOverviewPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminDevicesPage = lazy(() => import("./pages/admin/AdminDevicesPage"));
const AdminTelemetryPage = lazy(() => import("./pages/admin/AdminTelemetryPage"));
const AdminActivityPage = lazy(() => import("./pages/admin/AdminActivityPage"));
const AdminConfigPage = lazy(() => import("./pages/admin/AdminConfigPage"));

/**
 * Real URL routes replace the previous single-component tab switcher, so every
 * page is deep-linkable, the browser's back button works, and the admin area
 * is a route that can actually be guarded.
 */
function App() {
  return (
    <Routes>
      {/* Public authentication screens. A signed-in user is bounced to the
          dashboard rather than shown a login form for a session they have. */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-code" element={<VerifyCodePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Everything below requires a session. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pump-control" element={<PumpControlPage />} />
          <Route path="/live-monitoring" element={<LiveMonitoringPage />} />
          <Route path="/water-flow" element={<WaterFlowPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin nests inside the same chrome so the sidebar and header stay
              put when an admin moves between operations and administration. */}
          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<LoadingState />}>
                  <AdminLayout />
                </Suspense>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="devices" element={<AdminDevicesPage />} />
              <Route path="telemetry" element={<AdminTelemetryPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="config" element={<AdminConfigPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Unknown paths go to the dashboard, where the guard decides whether
          that means the dashboard or the login page. */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
