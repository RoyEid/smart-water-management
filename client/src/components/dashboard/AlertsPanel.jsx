import { AlertTriangle, CheckCircle2, CircleX, Info, ShieldAlert, WifiOff } from "lucide-react";

export default function AlertsPanel({ reading, isOnline, backendError = "" }) {
  const alerts = [];

  // 1. ESP32 Offline Alert
  if (!isOnline) {
    alerts.push({
      id: "esp32-offline",
      label: "ESP32 Offline",
      text: "Telemetry timeout: ESP32 device has not reported data for over 10 seconds.",
      type: "error",
      icon: WifiOff,
    });
  }

  // 2. Backend Disconnected
  if (backendError) {
    alerts.push({
      id: "backend-disconnected",
      label: "Backend Disconnected",
      text: backendError,
      type: "error",
      icon: CircleX,
    });
  }

  // 3. Upper Sensor Error
  if (
    reading?.upperTank?.tankStatus === "Sensor Error" ||
    reading?.failedSensor === "UPPER"
  ) {
    alerts.push({
      id: "upper-sensor-error",
      label: "Upper Sensor Error",
      text: "Ultrasonic sensor on Upper Tank (TRIG 7 / ECHO 15) failed to read distance.",
      type: "error",
      icon: ShieldAlert,
    });
  }

  // 4. Lower Sensor Error
  if (
    reading?.lowerTank?.tankStatus === "Sensor Error" ||
    reading?.failedSensor === "LOWER"
  ) {
    alerts.push({
      id: "lower-sensor-error",
      label: "Lower Sensor Error",
      text: "Ultrasonic sensor on Lower Tank (TRIG 12 / ECHO 13) failed to read distance.",
      type: "error",
      icon: ShieldAlert,
    });
  }

  // 5. Lower Tank Empty Alert
  if (
    reading?.lowerTank &&
    (reading.lowerTank.percentage <= 5 || reading.lowerTank.tankStatus === "Empty")
  ) {
    alerts.push({
      id: "lower-tank-empty",
      label: "Lower Tank Empty",
      text: "Lower tank water level has dropped to 0-5%. Refill source reservoir.",
      type: "warning",
      icon: AlertTriangle,
    });
  }

  // 6. Dry-run Protection Alert
  if (reading?.lowerTank && reading.lowerTank.percentage <= 10) {
    alerts.push({
      id: "dry-run-protection",
      label: "Pump Dry-Run Protection",
      text: "Pump is blocked from running to prevent mechanical dry-run damage (Lower tank ≤ 10%).",
      type: "warning",
      icon: ShieldAlert,
    });
  }

  // If no warnings or errors, display Nominal System status
  if (alerts.length === 0) {
    alerts.push({
      id: "nominal",
      label: "System Nominal",
      text: "All primary sensors and water pumps operational. Both tanks within normal parameters.",
      type: "success",
      icon: CheckCircle2,
    });
  }

  const themeStyles = {
    success: {
      border: "border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300",
    },
    warning: {
      border: "border-amber-200/90 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
      iconBg: "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300",
    },
    error: {
      border: "border-rose-200/90 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200",
      iconBg: "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300",
    },
    info: {
      border: "border-sky-200/90 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200",
      iconBg: "bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300",
    },
  };

  return (
    <section className="group overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
          Diagnostics & Safety Alerts
        </span>
        <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          System Notices
        </h2>
      </div>

      <div className="mt-5 space-y-3">
        {alerts.map((alertItem) => {
          const currentTheme = themeStyles[alertItem.type] || themeStyles.info;
          const AlertIcon = alertItem.icon;

          return (
            <div
              key={alertItem.id}
              className={`flex items-start gap-3.5 rounded-2xl border p-4 transition duration-300 ${currentTheme.border}`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl font-bold ${currentTheme.iconBg}`}
              >
                <AlertIcon size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold">{alertItem.label}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed opacity-90">
                  {alertItem.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
