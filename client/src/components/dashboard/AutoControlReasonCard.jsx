import { CheckCircle2, Info, ShieldAlert, ShieldCheck, Zap } from "lucide-react";

export default function AutoControlReasonCard({
  reading,
  controlState,
  isOnline = false,
}) {
  const upperLevel = reading?.upperTank?.percentage ?? 50;
  const lowerLevel = reading?.lowerTank?.percentage ?? 50;
  const pumpStatus = reading?.pumpStatus || "OFF";
  const systemEnabled = controlState?.systemEnabled ?? true;
  const pumpMode = controlState?.pumpMode || reading?.pumpMode || "AUTO";

  // Derive dynamic reasoning string & status type
  let reason = "";
  let type = "info"; // "success" | "warning" | "error" | "info"

  if (!isOnline) {
    reason = "Pump BLOCKED: ESP32 telemetry is offline. Safety interlock engaged.";
    type = "error";
  } else if (!systemEnabled) {
    reason = "Pump OFF: System is currently disabled from remote controls.";
    type = "warning";
  } else if (
    reading?.upperTank?.tankStatus === "Sensor Error" ||
    reading?.lowerTank?.tankStatus === "Sensor Error"
  ) {
    reason = "Pump BLOCKED: Ultrasonic sensor error reported. Emergency stop active.";
    type = "error";
  } else if (lowerLevel <= 10) {
    reason = `Pump BLOCKED: Dry-run protection active. Lower tank level is critically low (${lowerLevel.toFixed(1)}% ≤ 10%).`;
    type = "error";
  } else if (pumpMode === "MANUAL") {
    if (pumpStatus === "ON") {
      reason = "Pump ON: Operating under manual override command.";
      type = "success";
    } else {
      reason = "Pump OFF: Manual mode standby. Waiting for user actuation command.";
      type = "info";
    }
  } else {
    // AUTO MODE
    if (pumpStatus === "ON") {
      if (upperLevel <= 20 && lowerLevel >= 20) {
        reason = `Pump ON: Upper tank level is low (${upperLevel.toFixed(1)}% ≤ 20%) and Lower tank has sufficient water (${lowerLevel.toFixed(1)}% ≥ 20%).`;
        type = "success";
      } else {
        reason = `Pump ON: Automatic fill cycle running until Upper tank reaches 90% (Current: ${upperLevel.toFixed(1)}%).`;
        type = "success";
      }
    } else {
      if (upperLevel >= 90) {
        reason = `Pump OFF: Upper tank level is full (${upperLevel.toFixed(1)}% ≥ 90%).`;
        type = "info";
      } else if (lowerLevel < 20) {
        reason = `Pump OFF: Lower tank level (${lowerLevel.toFixed(1)}%) is below minimum start threshold (20%).`;
        type = "warning";
      } else {
        reason = `Pump OFF: Automatic monitoring nominal. Upper tank level (${upperLevel.toFixed(1)}%) is above start threshold (20%).`;
        type = "info";
      }
    }
  }

  const styles = {
    success: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200",
    warning: "border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
    error: "border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200",
    info: "border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200",
  };

  const IconMap = {
    success: CheckCircle2,
    warning: Info,
    error: ShieldAlert,
    info: ShieldCheck,
  };

  const Icon = IconMap[type];

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap size={16} className="text-sky-600 dark:text-cyan-400" />
          Automatic Control Reasoning
        </h3>
        <span className="rounded-full bg-sky-100 dark:bg-sky-950 px-3 py-1 text-[11px] font-bold text-sky-700 dark:text-cyan-300">
          {pumpMode} MODE
        </span>
      </div>

      {/* Rules Summary */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Start: Upper ≤ 20% & Lower ≥ 20%
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-blue-500" />
          Stop: Upper ≥ 90%
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-rose-500" />
          Safety Stop: Lower ≤ 10%
        </div>
      </div>

      {/* Live Status Box */}
      <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 transition-all ${styles[type]}`}>
        <Icon size={20} className="mt-0.5 shrink-0" />
        <p className="text-xs font-bold leading-relaxed">{reason}</p>
      </div>
    </div>
  );
}
