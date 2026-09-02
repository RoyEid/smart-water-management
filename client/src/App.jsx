import { Navigate, Route, Routes } from "react-router-dom";
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "./components/routing/RouteGuards";
import DashboardLayout from "./components/layout/DashboardLayout";

import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyCodePage from "./pages/VerifyCodePage";

import DashboardPage from "./pages/DashboardPage";
import PumpControlPage from "./pages/PumpControlPage";
import LiveMonitoringPage from "./pages/LiveMonitoringPage";
import WaterFlowPage from "./pages/WaterFlowPage";
import ElectricityPage from "./pages/ElectricityPage";
import HistoryPage from "./pages/HistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AlertsPage from "./pages/AlertsPage";
import DevicesPage from "./pages/DevicesPage";
import DeviceDetailPage from "./pages/DeviceDetailPage";
import SettingsPage from "./pages/SettingsPage";

/**
 * Real URL routes replace the previous single-component tab switcher, so every
 * page is deep-linkable and the browser's back button works.
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
          <Route path="/electricity" element={<ElectricityPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
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
