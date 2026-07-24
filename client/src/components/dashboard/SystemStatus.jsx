import { CircleCheck, CircleOff, Cpu, Radio, Wifi } from "lucide-react";

export default function SystemStatus({ isOnline, lastUpdated, className = "" }) {
  const label = isOnline ? "Online" : "Offline";
  const badgeClass = isOnline
    ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 ring-emerald-200/80 dark:ring-emerald-800/80"
    : "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 ring-rose-200/80 dark:ring-rose-800/80";

  const hardwareNodes = [
    { name: "ESP32 Controller", icon: Cpu },
    { name: "HC-SR04 Ultrasonic", icon: Radio },
    { name: "Wi-Fi Telemetry Link", icon: Wifi },
  ];

  return (
    <article
      className={`group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-900/10 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            System telemetry
          </p>
          <h3 className="mt-0.5 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            Hardware Status
          </h3>
        </div>
        <span
          className={`grid size-8 sm:size-9 shrink-0 place-items-center rounded-xl ring-1 transition duration-300 ${badgeClass}`}
        >
          <Radio size={16} aria-hidden="true" />
        </span>
      </div>

      {/* Hardware Node List with Responsive Wrap */}
      <div className="mt-3.5 space-y-2">
        {hardwareNodes.map(({ name, icon: NodeIcon }) => (
          <div
            key={name}
            className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 p-2.5 text-xs transition duration-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/80"
          >
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
              <NodeIcon
                size={14}
                className="shrink-0 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <span className="text-xs leading-tight">{name}</span>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold ring-1 ${badgeClass}`}
            >
              {isOnline && (
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              )}
              {isOnline ? (
                <CircleCheck size={11} aria-hidden="true" />
              ) : (
                <CircleOff size={11} aria-hidden="true" />
              )}
              <span>{label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3.5 border-t border-slate-100/80 dark:border-slate-800/80 pt-2.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        Last update · {lastUpdated}
      </div>
    </article>
  );
}
