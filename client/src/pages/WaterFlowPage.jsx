import { Droplets, Gauge, Info } from "lucide-react";
import MetricCard from "../components/dashboard/MetricCard";
import PageHeader from "../components/dashboard/PageHeader";
import WaterFlowCard from "../components/dashboard/WaterFlowCard";
import WaterTransferVisual from "../components/dashboard/WaterTransferVisual";
import { ErrorState } from "../components/ui/StateViews";
import useDeviceControl from "../hooks/useDeviceControl";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";
import {
  formatNumber,
  hasValue,
  TANK_CAPACITY_LITRES,
} from "../utils/telemetryFormat";

export default function WaterFlowPage() {
  const { reading, isOnline, isStale, error, socketConnected, lastUpdatedAt, retry } =
    useTelemetry();
  const { controlState } = useDeviceControl();
  const { t } = useLanguage();

  const flowRate = reading?.flowRateLMin;
  const transferred = reading?.totalTransferredLitres;
  const flowDataMode = reading?.flowDataMode ?? null;

  // Session progress toward a full destination tank. Only meaningful when a
  // transferred total was actually reported.
  const sessionProgress = hasValue(transferred)
    ? Math.min(100, (transferred / TANK_CAPACITY_LITRES) * 100)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("realtimeOverview")}
        title={t("waterFlow")}
        isOnline={isOnline}
        isStale={isStale}
        socketConnected={socketConnected}
        lastUpdatedAt={lastUpdatedAt}
      />

      {error && <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />}

      <WaterFlowCard
        flowRate={flowRate}
        totalVolume={transferred}
        flowDataMode={flowDataMode}
        isOnline={isOnline}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Gauge}
          label={t("currentFlowRate")}
          formatted={formatNumber(flowRate, { decimals: 2, unit: "L/min" })}
          detail={
            flowDataMode === "simulated"
              ? t("simulatedData")
              : flowDataMode === "measured"
              ? t("measuredData")
              : t("notReported")
          }
          accent="cyan"
        />
        <MetricCard
          icon={Droplets}
          label={t("sessionTransferred")}
          formatted={formatNumber(transferred, { decimals: 2, unit: "L" })}
          detail={t("capacityDetail")}
          accent="blue"
        />
        <MetricCard
          icon={Droplets}
          label={t("sessionProgress")}
          formatted={formatNumber(sessionProgress, { decimals: 1, unit: "%" })}
          detail={t("towardFullTank")}
          accent="emerald"
        />
      </section>

      {sessionProgress !== null && (
        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {t("sessionProgress")}
            </h3>
            <span className="shrink-0 text-xs font-extrabold tabular-nums text-slate-600 dark:text-slate-300">
              {transferred.toFixed(2)} / {TANK_CAPACITY_LITRES.toFixed(1)} L
            </span>
          </div>
          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-valuenow={Math.round(sessionProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("sessionProgress")}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-300 transition-[width] duration-700"
              style={{ width: `${sessionProgress}%` }}
            />
          </div>
        </section>
      )}

      <WaterTransferVisual
        pumpStatus={reading?.pumpStatus}
        pumpMode={controlState.pumpMode ?? reading?.pumpMode}
        isOnline={isOnline}
      />

      {/* States plainly what this page is showing, so a simulated reading is
          never mistaken for a measured one. */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-4 text-[11px] font-medium leading-relaxed text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700/80">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          {flowDataMode === "simulated"
            ? t("flowSimulatedNotice")
            : flowDataMode === "measured"
            ? t("flowMeasuredNotice")
            : t("flowUnknownNotice")}
        </span>
      </div>
    </div>
  );
}
