import { AlertTriangle, CheckCircle2, CircleX, Info } from "lucide-react";

export default function AlertsPanel({ reading, isOnline }) {
  const alert = !isOnline
    ? {
        text: "Telemetry timeout: ESP32 device has not reported for over 10 seconds.",
        type: "error",
        label: "Connection Offline",
      }
    : reading?.tankStatus === "Low" || reading?.tankStatus === "Empty"
    ? {
        text: "Water level is low. Automatic pump fill cycle has been engaged.",
        type: "warning",
        label: "Low Level Advisory",
      }
    : {
        text: "All primary systems operational. Water parameters within normal range.",
        type: "success",
        label: "System Nominal",
      };

  const themeStyles = {
    success: {
      border: "border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300",
      icon: CheckCircle2,
    },
    warning: {
      border: "border-amber-200/90 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
      iconBg: "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300",
      icon: AlertTriangle,
    },
    error: {
      border: "border-rose-200/90 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200",
      iconBg: "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300",
      icon: CircleX,
    },
    info: {
      border: "border-sky-200/90 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200",
      iconBg: "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300",
      icon: Info,
    },
  };

  const currentTheme = themeStyles[alert.type] || themeStyles.info;
  const AlertIcon = currentTheme.icon;

  return (
    <section className="group overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
          Diagnostics & Alerts
        </span>
        <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          System Notices
        </h2>
      </div>

      <div
        className={`mt-5 flex items-start gap-3.5 rounded-2xl border p-4.5 transition duration-300 ${currentTheme.border}`}
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl font-bold ${currentTheme.iconBg}`}
        >
          <AlertIcon size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-extrabold">{alert.label}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed opacity-90">
            {alert.text}
          </p>
        </div>
      </div>
    </section>
  );
}
