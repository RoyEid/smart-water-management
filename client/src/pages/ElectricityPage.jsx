import { Info, ShieldAlert, Cpu } from "lucide-react";
import PageHeader from "../components/dashboard/PageHeader";
import PowerSourceCard from "../components/dashboard/PowerSourceCard";
import WaterTransferVisual from "../components/dashboard/WaterTransferVisual";
import { EmptyState, ErrorState, OfflineState } from "../components/ui/StateViews";
import useDeviceControl from "../hooks/useDeviceControl";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Dedicated Electricity Source Monitoring & Control page.
 * Provides real-time Dawle / Moteur detection telemetry and generator pump permissions.
 */
export default function ElectricityPage() {
  const { reading, device, isOnline, isStale, isLoading, error, socketConnected, lastUpdatedAt, retry } =
    useTelemetry();
  const { controlState, updating, setAllowPumpOnMoteur } = useDeviceControl();
  const { t } = useLanguage();

  const powerSource = reading?.powerSource ?? "MOTEUR";
  const allowPumpOnMoteur = controlState.allowPumpOnMoteur ?? reading?.allowPumpOnMoteur ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("realtimeOverview")}
        title={t("electricitySource")}
        isOnline={isOnline}
        isStale={isStale}
        socketConnected={socketConnected}
        lastUpdatedAt={lastUpdatedAt}
      />

      {error && <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />}

      {isStale && !error && (
        <OfflineState message={t("staleDataNotice")} onRetry={retry} retryLabel={t("retry")} />
      )}

      {!isLoading && !device ? (
        <EmptyState
          icon={Cpu}
          title={t("noDeviceAssignedTitle")}
          description={t("noDeviceAssignedDesc")}
        />
      ) : (
        <>

      {/* Primary Electricity Source & Permission Control Card */}
      <section>
        <PowerSourceCard
          powerSource={powerSource}
          allowPumpOnMoteur={allowPumpOnMoteur}
          isOnline={isOnline}
          updating={updating}
          setAllowPumpOnMoteur={setAllowPumpOnMoteur}
        />
      </section>

      {/* Live System State & Transfer Visual */}
      <section>
        <WaterTransferVisual
          pumpStatus={reading?.pumpStatus}
          pumpMode={controlState.pumpMode ?? reading?.pumpMode}
          isOnline={isOnline}
        />
      </section>

      {/* Architectural & Safety Guidance */}
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 text-xs font-extrabold text-slate-900 dark:text-slate-100">
            <span className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-cyan-400">
              <Cpu size={16} aria-hidden="true" />
            </span>
            <span>Voltage Sensor Pin & Logic (GPIO 3)</span>
          </div>
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
            Connected to ESP32-S3 ADC1_CH2 (GPIO 3). Samples AC sinusoidal waveform over 40 ms cycles with multi-sample peak-to-peak amplitude detection and a 600 ms debounce confirmation window.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 text-xs font-extrabold text-slate-900 dark:text-slate-100">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ShieldAlert size={16} aria-hidden="true" />
            </span>
            <span>Fail-Safe & Safety Hierarchy</span>
          </div>
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
            Missing signal or sensor disconnection safely defaults to MOTEUR. Lower tank dry-run (&le; 10%), upper tank full (&ge; 90%), and sensor errors always outrank Moteur overrides.
          </p>
        </article>
      </section>

      {/* Sensor Notice */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-4 text-[11px] font-medium leading-relaxed text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700/80">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          The voltage detection sensor is dedicated exclusively to verifying Dawle grid presence. Water monitoring and tank telemetry remain 100% active on all power sources.
        </span>
      </div>
      </>
      )}
    </div>
  );
}
