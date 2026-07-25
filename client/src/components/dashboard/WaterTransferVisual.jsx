import { ArrowRight, ArrowUp, Droplets, RotateCw, Zap } from "lucide-react";

export default function WaterTransferVisual({ pumpStatus = "OFF", pumpMode = "AUTO", isOnline = false }) {
  const isPumping = isOnline && pumpStatus === "ON";

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
        <Droplets size={14} className={isPumping ? "animate-bounce" : ""} />
        Water Transfer System
      </div>

      {/* Pipe & Single Pump Graphic */}
      <div className="relative my-4 flex w-full flex-col lg:flex-row items-center justify-between gap-4 px-4 py-2">
        {/* Lower Tank Connection Label */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="size-2.5 rounded-full bg-indigo-500" />
          Lower Tank Source
        </div>

        {/* Animated Connecting Pipe */}
        <div className="relative flex flex-1 items-center justify-center w-full min-h-[48px] lg:min-h-[auto]">
          {/* Pipe Track */}
          <div className="absolute h-3 w-full lg:h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
            {/* Fluid Motion inside Pipe when Pump is ON */}
            {isPumping && (
              <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-300 animate-pulse opacity-90" />
            )}
          </div>

          {/* Central Single Water Pump Unit */}
          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 shadow-md">
            <div
              className={`rounded-xl p-2.5 transition-all ${
                isPumping
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-400"
              }`}
            >
              <RotateCw size={20} className={isPumping ? "animate-spin" : ""} />
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Primary Transfer Pump
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-extrabold ${
                    isPumping
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {isPumping ? "Pumping Active" : "Pump Standby"}
                </span>
                <span className="text-[10px] font-bold text-slate-400">({pumpMode})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upper Tank Connection Label */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="size-2.5 rounded-full bg-cyan-500" />
          Upper Tank Destination
        </div>
      </div>

      {/* Flow Direction Indicator */}
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        <ArrowRight size={14} className={isPumping ? "animate-pulse text-cyan-500" : ""} />
        <span>Flow Direction: Lower Reservoir → Upper Tank</span>
      </div>
    </div>
  );
}
