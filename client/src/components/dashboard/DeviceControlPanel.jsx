import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Power,
  ShieldAlert,
  Sliders,
  XCircle,
  Zap,
} from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { canCommandManualOn } from "../../utils/pumpReasoning";
import { formatTime } from "../../utils/telemetryFormat";

/**
 * The pump controls.
 *
 * Every control is disabled while a command is in flight, and the manual ON
 * button is additionally gated on the safety interlocks — the firmware would
 * refuse an unsafe manual start anyway, so offering the button would be
 * offering something that cannot happen.
 */
export default function DeviceControlPanel({
  controlState,
  reading,
  updating,
  loading,
  error,
  lastCommand,
  isOnline,
  toggleSystemEnabled,
  setPumpMode,
  setManualPumpState,
  setAllowPumpOnMoteur,
}) {
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const { systemEnabled, pumpMode, manualPumpState, allowPumpOnMoteur } = controlState;
  const knownSystemState = systemEnabled !== undefined;
  const isManual = pumpMode === "MANUAL";
  const isMoteur = isOnline && reading?.powerSource === "MOTEUR";

  const manualOnCheck = canCommandManualOn({ reading, controlState, isOnline });

  // A control that has not loaded yet must not be clickable: acting on an
  // unknown current state can send the opposite of what the user intends.
  // When viewed by an admin, all physical actuators are read-only.
  const controlsBusy = updating || loading || isAdmin;

  const runCommand = async (command, successKey) => {
    const result = await command();
    if (result?.duplicate) return;
    if (result?.ok) {
      toast.success(t(successKey));
    } else if (result?.message) {
      toast.error(result.message);
    }
  };

  const confirmAndRun = (config) => setPendingConfirm(config);

  const handleConfirm = async () => {
    const config = pendingConfirm;
    setPendingConfirm(null);
    if (config) await runCommand(config.command, config.successKey);
  };

  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 sm:p-7 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("remoteActuation")}
          </p>
          <h3 className="mt-0.5 truncate text-lg font-extrabold text-slate-900 dark:text-slate-100">
            {t("pumpControls")}
          </h3>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/80 dark:text-cyan-400 dark:ring-blue-900/60">
          <Sliders size={19} aria-hidden="true" />
        </span>
      </div>

      {error && (
        <div
          className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          role="alert"
        >
          <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {/* Admin Read-Only Notice */}
      {isAdmin && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 p-4 text-xs font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/60">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-extrabold">{t("adminReadOnlyTitle") || "Administrator View (Read-Only)"}</p>
            <p className="mt-0.5 text-[11px] opacity-90">
              {t("adminReadOnlyNotice") || "Physical pump controls and operational modes are restricted to the assigned installation user."}
            </p>
          </div>
        </div>
      )}

      {/* System master switch */}
      <section className="mt-6">
        <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
          {t("systemPower")}
        </h4>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {t("systemPowerDesc")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ControlButton
            active={knownSystemState && systemEnabled === true}
            disabled={controlsBusy}
            busy={updating}
            onClick={() =>
              runCommand(() => toggleSystemEnabled(true), "commandSystemEnabled")
            }
            tone="emerald"
            icon={Power}
            label={t("systemEnabled")}
          />
          <ControlButton
            active={knownSystemState && systemEnabled === false}
            disabled={controlsBusy}
            busy={updating}
            // Disabling stops the pump immediately, so it is confirmed.
            onClick={() =>
              confirmAndRun({
                titleKey: "confirmDisableTitle",
                descriptionKey: "confirmDisableDesc",
                confirmKey: "disableSystem",
                command: () => toggleSystemEnabled(false),
                successKey: "commandSystemDisabled",
              })
            }
            tone="rose"
            icon={Power}
            label={t("systemDisabled")}
          />
        </div>
      </section>

      {/* Operating mode */}
      <section className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
        <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
          {t("operatingMode")}
        </h4>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {t("operatingModeDesc")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ControlButton
            active={pumpMode === "AUTO"}
            disabled={controlsBusy}
            busy={updating}
            onClick={() => runCommand(() => setPumpMode("AUTO"), "commandModeAuto")}
            tone="blue"
            icon={Zap}
            label={t("autoMode")}
          />
          <ControlButton
            active={isManual}
            disabled={controlsBusy}
            busy={updating}
            onClick={() =>
              confirmAndRun({
                titleKey: "confirmManualTitle",
                descriptionKey: "confirmManualDesc",
                confirmKey: "manualMode",
                destructive: false,
                command: () => setPumpMode("MANUAL"),
                successKey: "commandModeManual",
              })
            }
            tone="amber"
            icon={Sliders}
            label={t("manualMode")}
          />
        </div>
      </section>

      {/* Manual pump command */}
      <section className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
        <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
          {t("manualCommand")}
        </h4>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {t("manualCommandDesc")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ControlButton
            active={isManual && manualPumpState === "ON"}
            disabled={controlsBusy || !manualOnCheck.allowed}
            busy={updating}
            onClick={() =>
              confirmAndRun({
                titleKey: "confirmPumpOnTitle",
                descriptionKey: "confirmPumpOnDesc",
                confirmKey: "startPump",
                destructive: false,
                command: () => setManualPumpState("ON"),
                successKey: "commandManualOn",
              })
            }
            tone="emerald"
            icon={Power}
            label={t("manualPumpOn")}
          />
          {/* Never gated: stopping the pump must always be available, whatever
              the telemetry says. An OFF command is safe by definition. */}
          <ControlButton
            active={isManual && manualPumpState === "OFF"}
            disabled={controlsBusy}
            busy={updating}
            onClick={() =>
              runCommand(() => setManualPumpState("OFF"), "commandManualOff")
            }
            tone="rose"
            icon={Power}
            label={t("manualPumpOff")}
          />
        </div>

        {!manualOnCheck.allowed && (
          <p
            className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60"
            role="status"
          >
            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{t(manualOnCheck.reasonKey)}</span>
          </p>
        )}
      </section>

      {/* Generator Pump Permission (visible when on Moteur) */}
      {isMoteur && (
        <section className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            {t("moteurPumpPermission")}
          </h4>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {t("moteurPumpPermissionDesc")}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ControlButton
              active={allowPumpOnMoteur === true}
              disabled={controlsBusy}
              busy={updating}
              onClick={() =>
                confirmAndRun({
                  titleKey: "confirmAllowMoteurTitle",
                  descriptionKey: "confirmAllowMoteurDesc",
                  confirmKey: "allowPumpOnMoteur",
                  destructive: false,
                  command: () => setAllowPumpOnMoteur(true),
                  successKey: "commandAllowMoteur",
                })
              }
              tone="emerald"
              icon={Zap}
              label={t("allowPumpOnMoteur")}
            />
            <ControlButton
              active={allowPumpOnMoteur === false}
              disabled={controlsBusy}
              busy={updating}
              onClick={() =>
                confirmAndRun({
                  titleKey: "confirmDisallowMoteurTitle",
                  descriptionKey: "confirmDisallowMoteurDesc",
                  confirmKey: "disallowPumpOnMoteur",
                  destructive: true,
                  command: () => setAllowPumpOnMoteur(false),
                  successKey: "commandDisallowMoteur",
                })
              }
              tone="rose"
              icon={Power}
              label={t("disallowPumpOnMoteur")}
            />
          </div>
        </section>
      )}

      {/* Last command result */}
      {lastCommand && (
        <div
          className={`mt-6 flex items-start gap-2 rounded-xl border p-3 text-[11px] font-bold ${
            lastCommand.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
          role="status"
          aria-live="polite"
        >
          {lastCommand.ok ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0">
            {t("lastCommand")}: {t(`command_${lastCommand.label}`)} ·{" "}
            {lastCommand.ok ? t("commandAccepted") : lastCommand.message}
            {formatTime(lastCommand.at, { locale: language }).hasValue && (
              <span className="ms-1 opacity-70">
                ({formatTime(lastCommand.at, { locale: language }).text})
              </span>
            )}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm ? t(pendingConfirm.titleKey) : ""}
        description={pendingConfirm ? t(pendingConfirm.descriptionKey) : ""}
        confirmLabel={pendingConfirm ? t(pendingConfirm.confirmKey) : ""}
        cancelLabel={t("cancel")}
        destructive={pendingConfirm?.destructive !== false}
        loading={updating}
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirm(null)}
      />
    </article>
  );
}

const TONE_ACTIVE = {
  emerald: "border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
  rose: "border-rose-500 bg-rose-600 text-white shadow-md shadow-rose-600/20",
  blue: "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/20",
  amber: "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20",
};

function ControlButton({ active, disabled, busy, onClick, tone, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-blue-900/30 ${
        active
          ? TONE_ACTIVE[tone]
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {busy && active ? (
        <LoaderCircle size={15} className="shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Icon size={15} className="shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}
