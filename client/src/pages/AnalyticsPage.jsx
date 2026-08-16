import { RefreshCw, Info, Cpu } from "lucide-react";
import PageHeader from "../components/dashboard/PageHeader";
import AnalyticsKPIs from "../components/analytics/AnalyticsKPIs";
import WaterTrendAreaChart from "../components/analytics/WaterTrendAreaChart";
import VolumeTransferredBarChart from "../components/analytics/VolumeTransferredBarChart";
import PowerAndModeBreakdown from "../components/analytics/PowerAndModeBreakdown";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/StateViews";
import useAnalytics from "../hooks/useAnalytics";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";

export default function AnalyticsPage() {
  const { range, setRange, analytics, loading, error, refresh, lastRefreshedAt } =
    useAnalytics("24h");
  const { isOnline, isStale, socketConnected } = useTelemetry();
  const { t } = useLanguage();

  const rangeButtons = [
    { id: "24h", label: t("range24h") || "24 Hours" },
    { id: "7d", label: t("range7d") || "7 Days" },
    { id: "30d", label: t("range30d") || "30 Days" },
    { id: "all", label: t("rangeAll") || "All Time" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          eyebrow={t("telemetryAnalytics") || "Telemetry Analytics & Insights"}
          title={t("analytics") || "Analytics"}
          isOnline={isOnline}
          isStale={isStale}
          socketConnected={socketConnected}
          lastUpdatedAt={lastRefreshedAt}
        />

        {/* Time Range Selector & Refresh Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            {rangeButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setRange(btn.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  range === btn.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title={t("refresh") || "Refresh Analytics"}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{t("refresh") || "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={refresh} retryLabel={t("retry")} />}

      {loading && !analytics && <LoadingState message={t("loadingAnalytics") || "Computing analytics aggregation..."} />}

      {!loading && !error && !analytics && (
        <EmptyState
          icon={Cpu}
          title={t("noDeviceAssignedTitle")}
          description={t("noDeviceAssignedDesc")}
        />
      )}

      {analytics && (
        <>
          {/* Top KPI Metric Cards */}
          <AnalyticsKPIs
            summary={analytics.summary}
            tankCapacities={analytics.tankCapacities}
          />

          {/* Time-Series Water Level Progression Area Chart */}
          <WaterTrendAreaChart
            buckets={analytics.buckets}
            range={range}
          />

          {/* Volume Transferred Bar Chart */}
          <VolumeTransferredBarChart
            buckets={analytics.buckets}
            range={range}
          />

          {/* Power Source & Pump Mode Distribution Cards */}
          <PowerAndModeBreakdown
            summary={analytics.summary}
          />

          {/* Aggregation Architecture Notice */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-4 text-[11px] font-medium leading-relaxed text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700/80">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>
              {t("analyticsNotice") ||
                "Analytics metrics are aggregated directly from ultrasonic distance telemetry, pump operation history, flow meter states, and Dawle voltage detection (GPIO 3)."}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
