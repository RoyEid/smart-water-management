import { Activity, Droplets, Waves } from "lucide-react";

export default function TankVisual({
  percentage = 0,
  status = "Waiting",
  pumpStatus = "OFF",
}) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
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
    statusStyles[status] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-700";

  return (
    <section className="group relative isolate overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-cyan-100/50 dark:bg-cyan-950/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-blue-100/50 dark:bg-blue-950/30 blur-3xl" />

      {/* Tank Header */}
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            Telemetry Centerpiece
          </span>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Primary Water Tank
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 transition-all ${currentBadgeClass}`}
          >
            <span
              className={`size-2 rounded-full ${
                status === "Low" || status === "Empty"
                  ? "animate-ping bg-amber-500"
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

      {/* 3D Glass Water Tank Representation */}
      <div className="relative mx-auto mt-6 flex min-h-[300px] items-center justify-center">
        {/* Glow ambient circle behind liquid */}
        <div className="absolute size-56 animate-pulse rounded-full bg-cyan-400/15 blur-3xl" />

        {/* Glass Container Outer Cylinder */}
        <div className="relative h-72 w-48 overflow-hidden rounded-b-[3rem] rounded-t-[2rem] border-[6px] border-slate-300/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 shadow-[inset_12px_0_24px_rgba(255,255,255,0.9),inset_-14px_0_28px_rgba(148,163,184,0.18),0_20px_40px_rgba(14,116,144,0.12)] dark:shadow-[inset_12px_0_24px_rgba(30,41,59,0.5),inset_-14px_0_28px_rgba(15,23,42,0.6),0_20px_40px_rgba(0,0,0,0.4)]">
          {/* Measurement Tick Markers (Level lines) */}
          <div className="pointer-events-none absolute inset-y-4 right-3 z-20 flex flex-col justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500">
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

          {/* Liquid Water Fill Body */}
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-400 transition-[height] duration-1000 ease-out"
            style={{ height: `${safePercentage}%` }}
          >
            {/* Surface Animated Wave Layer */}
            <div className="absolute -left-6 -top-3.5 h-7 w-[200%] animate-wave-slow rounded-[50%] bg-cyan-200/80 opacity-80" />
            <div className="absolute -left-10 -top-2.5 h-6 w-[200%] animate-wave-fast rounded-[50%] bg-white/40 opacity-90" />

            {/* Bubble Particles (Animated when pump is active) */}
            <div className="absolute inset-x-0 bottom-0 top-3 pointer-events-none">
              <span
                className={`absolute left-5 size-2 rounded-full bg-white/70 ${
                  isPumpActive ? "animate-bubble-1" : "opacity-30"
                }`}
              />
              <span
                className={`absolute right-7 size-1.5 rounded-full bg-cyan-100/90 ${
                  isPumpActive ? "animate-bubble-2" : "opacity-30"
                }`}
              />
            </div>

            {/* Volume Percentage Display overlay inside fluid */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-white drop-shadow-md">
                {safePercentage.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
