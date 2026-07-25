import { Activity, Cpu, Droplets, Radio, Ruler, Waves } from "lucide-react";

export default function TankVisual({
  title = "Water Tank",
  subtitle = "Ultrasonic Sensor",
  percentage = 0,
  distanceCm = 0,
  waterHeightCm = 0,
  status = "Waiting",
  pumpStatus = "OFF",
  isOnline = false,
  lastUpdated = "--",
  accent = "cyan", // "cyan" or "indigo"
}) {
  const safePercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
  const isPumpActive = pumpStatus === "ON";

  // Status color themes
  const statusStyles = {
    Empty: "bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 ring-amber-200/80 dark:ring-amber-800/80",
    Low: "bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 ring-amber-200/80 dark:ring-amber-800/80",
    Normal: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 ring-emerald-200/80 dark:ring-emerald-800/80",
    High: "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 ring-cyan-200/80 dark:ring-cyan-800/80",
    Full: "bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 ring-blue-200/80 dark:ring-blue-800/80",
    "Sensor Error": "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 ring-rose-200/80 dark:ring-rose-800/80",
  };

  const currentBadgeClass =
    statusStyles[status] ||
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-700";

  const isSensorError = status === "Sensor Error" || !isOnline;

  return (
    <section className="group relative isolate flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-cyan-100/40 dark:bg-cyan-950/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-blue-100/40 dark:bg-blue-950/30 blur-3xl" />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
              {subtitle}
            </span>
            <h3 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 transition-all ${currentBadgeClass}`}
            >
              <span
                className={`size-2 rounded-full ${
                  status === "Low" || status === "Empty"
                    ? "animate-ping bg-amber-500"
                    : status === "Sensor Error"
                    ? "bg-rose-500"
                    : status === "Full"
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}
              />
              {status}
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-cyan-400 ring-1 ring-sky-100 dark:ring-sky-900/60">
              <Droplets size={19} aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* 3D Vertical Water Tank Visualization */}
        <div className="relative mx-auto my-6 flex h-64 items-center justify-center">
          <div className="absolute size-48 animate-pulse rounded-full bg-cyan-400/15 blur-3xl" />

          {/* Glass Cylinder Container */}
          <div className="relative h-60 w-44 overflow-hidden rounded-b-[2.5rem] rounded-t-[1.5rem] border-[5px] border-slate-300/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 shadow-[inset_10px_0_20px_rgba(255,255,255,0.9),inset_-10px_0_20px_rgba(148,163,184,0.18),0_15px_30px_rgba(14,116,144,0.12)] dark:shadow-[inset_10px_0_20px_rgba(30,41,59,0.5),inset_-10px_0_20px_rgba(15,23,42,0.6),0_15px_30px_rgba(0,0,0,0.4)]">
            {/* Height markings */}
            <div className="pointer-events-none absolute inset-y-3 right-2.5 z-20 flex flex-col justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-2 bg-slate-300 dark:bg-slate-600" /> 100%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-1.5 bg-slate-300 dark:bg-slate-600" /> 75%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-2 bg-slate-300 dark:bg-slate-600" /> 50%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-1.5 bg-slate-300 dark:bg-slate-600" /> 25%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-2 bg-slate-300 dark:bg-slate-600" /> 0%
              </span>
            </div>

            {/* Fluid Water Level */}
            <div
              className={`absolute inset-x-0 bottom-0 overflow-hidden transition-[height] duration-1000 ease-out ${
                isSensorError
                  ? "bg-gradient-to-t from-slate-400 to-slate-300 opacity-60"
                  : accent === "indigo"
                  ? "bg-gradient-to-t from-indigo-600 via-blue-500 to-cyan-400"
                  : "bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-400"
              }`}
              style={{ height: `${safePercentage}%` }}
            >
              {/* Waves */}
              {!isSensorError && (
                <>
                  <div className="absolute -left-6 -top-3 h-6 w-[200%] animate-wave-slow rounded-[50%] bg-cyan-200/80 opacity-80" />
                  <div className="absolute -left-10 -top-2 h-5 w-[200%] animate-wave-fast rounded-[50%] bg-white/40 opacity-90" />
                </>
              )}

              {/* Bubbles when active */}
              {isPumpActive && !isSensorError && (
                <div className="absolute inset-x-0 bottom-0 top-3 pointer-events-none">
                  <span className="absolute left-4 size-2 rounded-full bg-white/70 animate-bubble-1" />
                  <span className="absolute right-6 size-1.5 rounded-full bg-cyan-100/90 animate-bubble-2" />
                </div>
              )}

              {/* Central Percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-white drop-shadow-md">
                  {safePercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Readout Metrics */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <Ruler size={13} className="text-cyan-600 dark:text-cyan-400" />
              Distance
            </p>
            <p className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-slate-100">
              {typeof distanceCm === "number" ? distanceCm.toFixed(1) : "--"}{" "}
              <span className="text-xs font-normal text-slate-400">cm</span>
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <Waves size={13} className="text-blue-600 dark:text-blue-400" />
              Water Height
            </p>
            <p className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-slate-100">
              {typeof waterHeightCm === "number" ? waterHeightCm.toFixed(1) : "--"}{" "}
              <span className="text-xs font-normal text-slate-400">cm</span>
            </p>
          </div>
        </div>
      </div>

      {/* Connection & Timestamp Status Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full ${
              status === "Sensor Error"
                ? "bg-rose-500"
                : isOnline
                ? "animate-pulse bg-emerald-500"
                : "bg-amber-500"
            }`}
          />
          <span>
            {status === "Sensor Error"
              ? "Sensor Fault"
              : isOnline
              ? "Sensor Active"
              : "Sensor Offline"}
          </span>
        </div>
        <span className="text-slate-400 dark:text-slate-500">{lastUpdated}</span>
      </div>
    </section>
  );
}
