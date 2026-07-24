import { Activity, Power, RotateCw, Sliders, ToggleLeft, ToggleRight, Zap } from "lucide-react";

export default function DeviceControlPanel({
  controlState,
  updating,
  error,
  toggleSystemEnabled,
  setPumpMode,
  setManualPumpState,
  isOnline,
  realPumpStatus = "OFF",
}) {
  const { systemEnabled, pumpMode, manualPumpState } = controlState;

  return (
    <section className="group overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            Remote Operations
          </span>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Device Control
            <Sliders size={18} className="text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          </h2>
        </div>
        <span
          className={`grid size-9 place-items-center rounded-xl ring-1 transition ${
            systemEnabled
              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 ring-emerald-200/80 dark:ring-emerald-800/80"
              : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 ring-rose-200/80 dark:ring-rose-800/80"
          }`}
        >
          <Power size={17} aria-hidden="true" />
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
          {error}
        </p>
      )}

      {/* Control Grid */}
      <div className="mt-5 space-y-5">
        {/* 1. System Status Enable / Disable */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">System Status</p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {systemEnabled ? "System Active · Telemetry & Pump Allowed" : "System Disabled · Pump Forced OFF"}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ring-1 ${
                systemEnabled
                  ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-800"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  systemEnabled ? "animate-pulse bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {systemEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={updating || systemEnabled}
              onClick={() => toggleSystemEnabled(true)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition duration-200 ${
                systemEnabled
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-200 dark:hover:border-emerald-800"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              🟢 Enable
            </button>
            <button
              type="button"
              disabled={updating || !systemEnabled}
              onClick={() => toggleSystemEnabled(false)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition duration-200 ${
                !systemEnabled
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-2 ring-rose-500"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-200 dark:hover:border-rose-800"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              🔴 Disable
            </button>
          </div>
        </div>

        {/* 2. Pump Mode Selector (Automatic vs Manual) */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pump Mode</p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {pumpMode === "AUTO"
                  ? "Automatic level threshold control"
                  : "Manual user dashboard control"}
              </p>
            </div>
            <span className="rounded-md bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 font-mono text-[10px] font-extrabold text-sky-700 dark:text-cyan-300 ring-1 ring-sky-200 dark:ring-sky-800">
              {pumpMode}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={updating || !systemEnabled || pumpMode === "AUTO"}
              onClick={() => setPumpMode("AUTO")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition duration-200 ${
                pumpMode === "AUTO"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-500"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-cyan-300"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Activity size={14} aria-hidden="true" />
              Automatic
            </button>
            <button
              type="button"
              disabled={updating || !systemEnabled || pumpMode === "MANUAL"}
              onClick={() => setPumpMode("MANUAL")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition duration-200 ${
                pumpMode === "MANUAL"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20 ring-2 ring-cyan-500"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 hover:text-cyan-700 dark:hover:text-cyan-300"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Sliders size={14} aria-hidden="true" />
              Manual
            </button>
          </div>
        </div>

        {/* 3. Manual Pump Control (Visible ONLY when Manual mode is active) */}
        {pumpMode === "MANUAL" && (
          <div className="rounded-2xl border border-cyan-100 dark:border-cyan-900/50 bg-gradient-to-br from-cyan-50/60 to-blue-50/60 dark:from-cyan-950/40 dark:to-blue-950/40 p-4 transition-all duration-300">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Manual Pump Control
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Direct relay actuation override
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  manualPumpState === "ON"
                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {manualPumpState === "ON" ? "ON" : "OFF"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  updating || !systemEnabled || manualPumpState === "ON"
                }
                onClick={() => setManualPumpState("ON")}
                className={`inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-extrabold transition duration-200 ${
                  manualPumpState === "ON"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400"
                    : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Zap size={14} aria-hidden="true" />
                Turn Pump ON
              </button>
              <button
                type="button"
                disabled={
                  updating || !systemEnabled || manualPumpState === "OFF"
                }
                onClick={() => setManualPumpState("OFF")}
                className={`inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-extrabold transition duration-200 ${
                  manualPumpState === "OFF"
                    ? "bg-slate-700 text-white shadow-md shadow-slate-700/20 ring-2 ring-slate-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-700 hover:text-white"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Power size={14} aria-hidden="true" />
                Turn Pump OFF
              </button>
            </div>
          </div>
        )}

        {/* Real-time Status Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Current Pump Status</span>
          <span
            className={`inline-flex items-center gap-1.5 font-bold ${
              !isOnline
                ? "text-rose-600 dark:text-rose-400"
                : realPumpStatus === "ON"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                !isOnline
                  ? "bg-rose-500"
                  : realPumpStatus === "ON"
                  ? "animate-pulse bg-emerald-500"
                  : "bg-slate-400"
              }`}
            />
            {!isOnline ? "Offline" : realPumpStatus === "ON" ? "Running" : "Stopped"}
          </span>
        </div>
      </div>
    </section>
  );
}
