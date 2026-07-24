import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Droplets,
  Gauge,
  Info,
  Radio,
  RotateCw,
  Ruler,
  ShieldCheck,
  Sliders,
  Waves,
  Wifi,
  Zap,
} from "lucide-react";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import DeviceControlPanel from "../components/dashboard/DeviceControlPanel";
import MetricCard from "../components/dashboard/MetricCard";
import SystemStatus from "../components/dashboard/SystemStatus";
import TankVisual from "../components/dashboard/TankVisual";
import WaterLevelChart from "../components/dashboard/WaterLevelChart";
import Sidebar from "../components/layout/Sidebar";
import TopHeader from "../components/layout/TopHeader";
import useDeviceControl from "../hooks/useDeviceControl";
import useTankData from "../hooks/useTankData";
import api from "../services/api";
import SettingsPage from "./SettingsPage";
import { useLanguage } from "../context/LanguageContext";

const MOCK_SYSTEM_DATA = {
  pumpStatus: "Standby",
  operatingMode: "Automatic",
  flowRate: "0.0 L/min",
  totalTransferred: "0 L",
  electricitySource: "Mains",
  voltage: "220 V",
  current: "0.0 A",
  lowerTankLevel: "-- %",
};

export default function Dashboard() {
  const { reading, readings, isOnline, error, unauthorized } = useTankData();
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const tabTitles = {
    dashboard: t("dashboardOverview"),
    "pump-control": t("remotePumpControl"),
    "live-monitoring": t("liveSensorTelemetry"),
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
  const value = (key, fallback = "--") => (reading ? reading[key] : fallback);
  const tankStatus = reading?.tankStatus || "Offline";

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
      {/* Toast Notification for Future Features */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-900 dark:bg-sky-950 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-bounce">
          <Info size={16} className="text-cyan-300" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Responsive IoT Navigation Sidebar */}
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
                    {t("waterTankCenterpiece")}
                  </h2>
                </div>
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                  <Activity size={14} className="text-cyan-600 dark:text-cyan-400" />
                  {t("telemetryLive")} · {lastUpdated}
                </p>
              </div>

              {/* Upper Layout: Tank Centerpiece + Metric Grid */}
              <section className="grid gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.55fr)]">
                <TankVisual
                  percentage={value("percentage", 0)}
                  status={value("tankStatus", "Waiting for sensor")}
                  pumpStatus={reading?.pumpStatus}
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    icon={Droplets}
                    label="Water level"
                    value={Number(value("percentage", 0)).toFixed(1)}
                    unit="%"
                    detail="Ultrasonic volume calculation"
                    accent="cyan"
                  />
                  <MetricCard
                    icon={Ruler}
                    label="Sensor distance"
                    value={reading ? reading.distanceCm.toFixed(1) : "--"}
                    unit="cm"
                    detail="Transducer to surface"
                    accent="blue"
                  />
                  <MetricCard
                    icon={Waves}
                    label="Water height"
                    value={reading ? reading.waterHeightCm.toFixed(1) : "--"}
                    unit="cm"
                    detail="Tank usable column height"
                    accent="indigo"
                  />

                  <SystemStatus
                    isOnline={isOnline}
                    lastUpdated={lastUpdated}
                    className="sm:col-span-2 xl:col-span-1"
                  />

                  {/* Tank Status Card */}
                  <article className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-900/10">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tank status</p>
                    <p
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${
                        tankStatus === "Empty" || tankStatus === "Low"
                          ? "bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 ring-amber-200/80 dark:ring-amber-800"
                          : tankStatus === "Full" || tankStatus === "High"
                          ? "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 ring-cyan-200/80 dark:ring-cyan-800"
                          : isOnline
                          ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 ring-emerald-200/80 dark:ring-emerald-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700"
                      }`}
                    >
                      {tankStatus}
                    </p>
                    <div className="mt-4 border-t border-slate-100/80 dark:border-slate-800/80 pt-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      Reported by tank-01
                    </div>
                  </article>

                  {/* Dedicated Water Pump Card */}
                  <article className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-900/10">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Water pump</p>
                      <span
                        className={`rounded-xl p-2 transition-all duration-300 ${
                          !isOnline
                            ? "bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 ring-1 ring-rose-200/80 dark:ring-rose-800"
                            : reading?.pumpStatus === "ON"
                            ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200/80 dark:ring-emerald-800 shadow-sm shadow-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700"
                        }`}
                      >
                        <RotateCw
                          size={18}
                          aria-hidden="true"
                          className={`transition-transform ${
                            isOnline && reading?.pumpStatus === "ON"
                              ? "animate-spin text-emerald-600 dark:text-emerald-400"
                              : ""
                          }`}
                        />
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${
                          !isOnline
                            ? "bg-rose-500"
                            : reading?.pumpStatus === "ON"
                            ? "animate-pulse bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <p
                        className={`text-xl font-extrabold tracking-tight ${
                          !isOnline
                            ? "text-rose-700 dark:text-rose-400"
                            : reading?.pumpStatus === "ON"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {!isOnline
                          ? "Error (Offline)"
                          : reading?.pumpStatus === "ON"
                          ? "Running"
                          : "Standby"}
                      </p>
                    </div>
                    <div className="mt-4 border-t border-slate-100/80 dark:border-slate-800/80 pt-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {!isOnline
                        ? "Communication error"
                        : reading?.pumpStatus === "ON"
                        ? "Actively pumping water"
                        : controlState.pumpMode === "MANUAL"
                        ? "Manual mode idle"
                        : "Automatic relay mode"}
                    </div>
                  </article>
                </div>
              </section>

              {/* Middle Section: Chart & System Notices */}
              <section className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                  <WaterLevelChart readings={readings} />
                </div>
                <AlertsPanel reading={reading} isOnline={isOnline} />
              </section>

              {/* Supplementary Grid */}
              <section
                aria-label="Supplementary system metrics"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                <MetricCard
                  icon={Gauge}
                  label="Total transferred"
                  value={MOCK_SYSTEM_DATA.totalTransferred}
                  detail="Flow calculation parameter"
                  accent="violet"
                />
                <MetricCard
                  icon={Zap}
                  label="Electricity source"
                  value={MOCK_SYSTEM_DATA.electricitySource}
                  detail="Power grid Status"
                  accent="amber"
                />
                <MetricCard
                  icon={Zap}
                  label="Voltage / Current"
                  value={MOCK_SYSTEM_DATA.voltage}
                  unit={MOCK_SYSTEM_DATA.current}
                  detail="Electrical telemetry"
                  accent="amber"
                />
                <MetricCard
                  icon={Waves}
                  label="Lower tank level"
                  value={MOCK_SYSTEM_DATA.lowerTankLevel}
                  detail="Secondary reservoir"
                  accent="blue"
                />
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
                            reading?.pumpStatus === "ON" ? "animate-spin text-emerald-600 dark:text-emerald-400" : ""
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
                        Disabling the System immediately forces the Pump OFF.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">•</span>
                        If ultrasonic echo fails or times out, the ESP32 safety loop halts the pump.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">•</span>
                        In AUTO mode, pump starts at $\le 20\%$ level and stops at $\ge 90\%$.
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
                    Live Hardware Diagnostics
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
                  label="Distance to water"
                  value={reading ? reading.distanceCm.toFixed(1) : "--"}
                  unit="cm"
                  detail="Raw ultrasonic echo distance"
                  accent="cyan"
                />
                <MetricCard
                  icon={Waves}
                  label="Water column height"
                  value={reading ? reading.waterHeightCm.toFixed(1) : "--"}
                  unit="cm"
                  detail="Usable tank water height"
                  accent="blue"
                />
                <MetricCard
                  icon={Droplets}
                  label="Calculated level"
                  value={Number(value("percentage", 0)).toFixed(1)}
                  unit="%"
                  detail="Tank capacity percentage"
                  accent="indigo"
                />
                <MetricCard
                  icon={Cpu}
                  label="ESP32 Controller"
                  value={isOnline ? "ONLINE" : "OFFLINE"}
                  detail="Wi-Fi link to Express API"
                  accent={isOnline ? "emerald" : "amber"}
                />
              </div>

              {/* Live Readings Chart */}
              <WaterLevelChart readings={readings} />
            </div>
          )}

          {/* VIEW 4: SETTINGS */}
          {activeTab === "settings" && (
            <SettingsPage logout={logout} loggingOut={loggingOut} />
          )}
        </main>
      </div>
    </div>
  );
}
