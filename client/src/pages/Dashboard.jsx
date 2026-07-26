import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Droplets,
  Info,
  Radio,
  RotateCw,
  Ruler,
  ShieldCheck,
  Waves,
} from "lucide-react";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import AutoControlReasonCard from "../components/dashboard/AutoControlReasonCard";
import DeviceControlPanel from "../components/dashboard/DeviceControlPanel";
import MetricCard from "../components/dashboard/MetricCard";
import TankVisual from "../components/dashboard/TankVisual";
import WaterFlowCard from "../components/dashboard/WaterFlowCard";
import WaterLevelChart from "../components/dashboard/WaterLevelChart";
import WaterTransferVisual from "../components/dashboard/WaterTransferVisual";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import useDeviceControl from "../hooks/useDeviceControl";
import useTankData from "../hooks/useTankData";
import api from "../services/api";
import SettingsPage from "./SettingsPage";
import { useLanguage } from "../context/LanguageContext";

export default function Dashboard() {
  const { reading, readings, isOnline, error, unauthorized } = useTankData();
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const tabTitles = {
    dashboard: t("dashboardOverview"),
    "pump-control": t("remotePumpControl"),
    "live-monitoring": t("liveSensorTelemetry"),
    "water-flow": t("waterFlow"),
    settings: t("accountSettings"),
  };

  const {
    controlState,
    updating: controlUpdating,
    error: controlError,
    toggleSystemEnabled,
    setPumpMode,
    setManualPumpState,
  } = useDeviceControl();

  // Active tab state with localStorage persistence
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("smart_water_active_tab") || "dashboard";
  });

  // Responsive sidebar states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (unauthorized) navigate("/login", { replace: true });
  }, [navigate, unauthorized]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem("smart_water_active_tab", tabId);
  };

  const handleShowToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const lastUpdated = reading?.receivedAt
    ? new Date(reading.receivedAt).toLocaleTimeString()
    : t("awaitingData");

  const upperTank = reading?.upperTank || {
    percentage: 0,
    distanceCm: 0,
    waterHeightCm: 0,
    tankStatus: "Offline",
  };

  const lowerTank = reading?.lowerTank || {
    percentage: 0,
    distanceCm: 0,
    waterHeightCm: 0,
    tankStatus: "Offline",
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/auth/logout");
    } finally {
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  const desktopPadding = isCollapsed
    ? isRtl
      ? "lg:pr-20 lg:pl-0"
      : "lg:pl-20 lg:pr-0"
    : isRtl
    ? "lg:pr-64 lg:pl-0"
    : "lg:pl-64 lg:pr-0";

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-900 dark:bg-sky-950 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-bounce">
          <Info size={16} className="text-cyan-300" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onShowToast={handleShowToast}
      />

      {/* Main Content Area */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${desktopPadding}`}
      >
        {/* Sticky Top Header */}
        <TopHeader
          pageTitle={tabTitles[activeTab] || t("dashboardOverview")}
          isOnline={isOnline}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          logout={logout}
          loggingOut={loggingOut}
        />

        {/* Dynamic View Content Container */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {error && (
            <p
              role="alert"
              className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3.5 text-sm font-semibold text-amber-900 dark:text-amber-300 shadow-sm"
            >
              {error}
            </p>
          )}

          {/* VIEW 1: MAIN DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Header Status Bar */}
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                    {t("realtimeOverview")}
                  </p>
                  <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                    Dual Tank Telemetry System
                  </h2>
                </div>
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                  <Activity size={14} className="text-cyan-600 dark:text-cyan-400" />
                  {t("telemetryLive")} · {lastUpdated}
                </p>
              </div>

              {/* Dual Tank Visualization Grid: Side-by-side on Desktop, Stacked on Mobile */}
              <section className="space-y-4">
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  <TankVisual
                    title="Upper Tank"
                    subtitle="TRIG GPIO 7 / ECHO GPIO 15"
                    percentage={upperTank.percentage}
                    distanceCm={upperTank.distanceCm}
                    waterHeightCm={upperTank.waterHeightCm}
                    status={upperTank.tankStatus}
                    pumpStatus={reading?.pumpStatus}
                    isOnline={isOnline}
                    lastUpdated={lastUpdated}
                    accent="cyan"
                  />

                  <TankVisual
                    title="Lower Tank"
                    subtitle="TRIG GPIO 12 / ECHO GPIO 13"
                    percentage={lowerTank.percentage}
                    distanceCm={lowerTank.distanceCm}
                    waterHeightCm={lowerTank.waterHeightCm}
                    status={lowerTank.tankStatus}
                    pumpStatus={reading?.pumpStatus}
                    isOnline={isOnline}
                    lastUpdated={lastUpdated}
                    accent="indigo"
                  />
                </div>

                {/* Water Transfer Visualization with Single Pump & Animated Pipe */}
                <WaterTransferVisual
                  pumpStatus={reading?.pumpStatus || "OFF"}
                  pumpMode={controlState.pumpMode || reading?.pumpMode || "AUTO"}
                  isOnline={isOnline}
                />
              </section>

              {/* Auto Control Information Card & Safety Alerts */}
              <section className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <AutoControlReasonCard
                  reading={reading}
                  controlState={controlState}
                  isOnline={isOnline}
                />
                <AlertsPanel
                  reading={reading}
                  isOnline={isOnline}
                  backendError={error}
                />
              </section>

              {/* Metric Cards Grid */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={Droplets}
                  label="Upper Tank Level"
                  value={upperTank.percentage.toFixed(1)}
                  unit="%"
                  detail="Destination Reservoir"
                  accent="cyan"
                />
                <MetricCard
                  icon={Waves}
                  label="Lower Tank Level"
                  value={lowerTank.percentage.toFixed(1)}
                  unit="%"
                  detail="Source Reservoir"
                  accent="indigo"
                />
                <MetricCard
                  icon={Ruler}
                  label="Upper Distance"
                  value={upperTank.distanceCm.toFixed(1)}
                  unit="cm"
                  detail="Sensor to surface"
                  accent="blue"
                />
                <MetricCard
                  icon={Ruler}
                  label="Lower Distance"
                  value={lowerTank.distanceCm.toFixed(1)}
                  unit="cm"
                  detail="Sensor to surface"
                  accent="blue"
                />
              </section>

              {/* Water Flow Telemetry */}
              <section>
                <WaterFlowCard
                  flowRate={reading?.flowRateLMin}
                  totalVolume={reading?.totalTransferredLitres}
                  flowDataMode={reading?.flowDataMode}
                  isOnline={isOnline}
                />
              </section>

              {/* Multi-Series Telemetry Chart */}
              <section>
                <WaterLevelChart readings={readings} />
              </section>
            </div>
          )}

          {/* VIEW 2: DEDICATED PUMP CONTROL */}
          {activeTab === "pump-control" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                    Remote Actuation
                  </p>
                  <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                    Pump Operating Mode & Controls
                  </h2>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <DeviceControlPanel
                    controlState={controlState}
                    updating={controlUpdating}
                    error={controlError}
                    toggleSystemEnabled={toggleSystemEnabled}
                    setPumpMode={setPumpMode}
                    setManualPumpState={setManualPumpState}
                    isOnline={isOnline}
                    realPumpStatus={reading?.pumpStatus || "OFF"}
                  />
                </div>

                <div className="space-y-6">
                  {/* Real Pump Status Summary Card */}
                  <article className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 sm:p-7">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Pump Hardware Telemetry
                      </h3>
                      <span
                        className={`rounded-xl p-2 ${
                          reading?.pumpStatus === "ON"
                            ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <RotateCw
                          size={18}
                          className={
                            reading?.pumpStatus === "ON"
                              ? "animate-spin text-emerald-600 dark:text-emerald-400"
                              : ""
                          }
                        />
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Pump State</p>
                      <p
                        className={`mt-1 text-2xl font-extrabold ${
                          reading?.pumpStatus === "ON"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {reading?.pumpStatus === "ON" ? "Actively Pumping" : "Pump Stopped (Idle)"}
                      </p>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Relay Output Pin</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">GPIO 4</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Relay Logic</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Active LOW</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Control Mode</span>
                        <span className="font-bold text-blue-700 dark:text-cyan-400">{controlState.pumpMode}</span>
                      </div>
                    </div>
                  </article>

                  {/* Safety Rules Card */}
                  <article className="rounded-3xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/30 p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-sm">
                      <ShieldCheck size={18} className="text-amber-700 dark:text-amber-400" />
                      Automatic Safety Rules
                    </div>
                    <ul className="mt-3 space-y-2 text-xs font-semibold text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="font-bold">•</span>
                        Disabling System immediately stops the Pump.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">•</span>
                        Lower Tank ≤ 10% blocks pump (Dry-run protection).
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">•</span>
                        AUTO mode starts at Upper ≤ 20% & Lower ≥ 20%, stops at Upper ≥ 90%.
                      </li>
                    </ul>
                  </article>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: DEDICATED LIVE MONITORING */}
          {activeTab === "live-monitoring" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                    Telemetry Stream
                  </p>
                  <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                    Live Dual Hardware Diagnostics
                  </h2>
                </div>
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                  <Radio size={14} className="text-cyan-600 dark:text-cyan-400 animate-pulse" />
                  Update rate: 2000 ms
                </p>
              </div>

              {/* Hardware Telemetry Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={Radio}
                  label="Upper Distance"
                  value={upperTank.distanceCm.toFixed(1)}
                  unit="cm"
                  detail="TRIG 7 / ECHO 15"
                  accent="cyan"
                />
                <MetricCard
                  icon={Radio}
                  label="Lower Distance"
                  value={lowerTank.distanceCm.toFixed(1)}
                  unit="cm"
                  detail="TRIG 12 / ECHO 13"
                  accent="indigo"
                />
                <MetricCard
                  icon={Droplets}
                  label="Upper Level"
                  value={upperTank.percentage.toFixed(1)}
                  unit="%"
                  detail="Capacity Percentage"
                  accent="cyan"
                />
                <MetricCard
                  icon={Waves}
                  label="Lower Level"
                  value={lowerTank.percentage.toFixed(1)}
                  unit="%"
                  detail="Capacity Percentage"
                  accent="indigo"
                />
              </div>

              {/* Live Multi-Series Chart */}
              <WaterLevelChart readings={readings} />
            </div>
          )}

          {/* VIEW 4: DEDICATED WATER FLOW */}
          {activeTab === "water-flow" && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                    {t("realtimeOverview")}
                  </p>
                  <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                    {t("waterFlow")}
                  </h2>
                </div>
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                  <Activity size={14} className="text-cyan-600 dark:text-cyan-400" />
                  {t("telemetryLive")} · {lastUpdated}
                </p>
              </div>

              <WaterFlowCard
                flowRate={reading?.flowRateLMin}
                totalVolume={reading?.totalTransferredLitres}
                flowDataMode={reading?.flowDataMode}
                isOnline={isOnline}
              />

              {/* Flow occurs while water is transferred between tanks */}
              <WaterTransferVisual
                pumpStatus={reading?.pumpStatus || "OFF"}
                pumpMode={controlState.pumpMode || reading?.pumpMode || "AUTO"}
                isOnline={isOnline}
              />
            </div>
          )}

          {/* VIEW 5: SETTINGS */}
          {activeTab === "settings" && (
            <SettingsPage logout={logout} loggingOut={loggingOut} />
          )}
        </main>
      </div>
    </div>
  );
}
