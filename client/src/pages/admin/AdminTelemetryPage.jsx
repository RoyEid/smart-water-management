import { Link } from "react-router-dom";
import { Database } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../../components/ui/StateViews";
import { fetchTelemetryStats } from "../../services/adminApi";
import useAsyncData from "../../hooks/useAsyncData";
import { useLanguage } from "../../context/LanguageContext";
import { formatTimestamp } from "../../utils/telemetryFormat";

export default function AdminTelemetryPage() {
  const { t, language } = useLanguage();
  const { data, isLoading, error, retry } = useAsyncData(fetchTelemetryStats, [], {
    fallbackMessage: "Unable to load telemetry statistics.",
  });

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {t("telemetryRecords")}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("telemetryStatsDesc")}
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-200/60 dark:bg-violet-950/80 dark:text-violet-400 dark:ring-violet-800/60">
            <Database size={19} aria-hidden="true" />
          </span>
        </div>

        {!isLoading && !error && data && (
          <p className="mt-4 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
            {data.totalRecords.toLocaleString()}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {t("perDeviceBreakdown")}
        </h3>

        <div className="mt-4">
          {isLoading && <TableSkeleton rows={3} columns={4} />}

          {!isLoading && error && (
            <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
          )}

          {!isLoading && !error && data?.devices?.length === 0 && (
            <EmptyState
              icon={Database}
              title={t("noTelemetryTitle")}
              description={t("noTelemetryDesc")}
            />
          )}

          {!isLoading && !error && data?.devices?.length > 0 && (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[42rem] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th scope="col" className="px-3 py-3 text-start ps-5 sm:ps-6">{t("device")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("state")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("storedReadings")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("oldestRecord")}</th>
                    <th scope="col" className="px-3 py-3 text-start pe-5 sm:pe-6">{t("newestRecord")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700 dark:divide-slate-800/60 dark:text-slate-300">
                  {data.devices.map((device) => {
                    const oldest = formatTimestamp(device.oldestAt, { locale: language });
                    const newest = formatTimestamp(device.newestAt, { locale: language });

                    return (
                      <tr key={device.deviceId}>
                        <td className="px-3 py-3 ps-5 sm:ps-6">
                          <Link
                            to={`/devices/${device.deviceId}`}
                            className="font-extrabold text-blue-600 hover:underline dark:text-cyan-400"
                          >
                            {device.displayName}
                          </Link>
                          <span className="block font-mono text-[10px] text-slate-400">
                            {device.deviceId}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              device.isOnline
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {device.isOnline ? t("deviceOnline") : t("deviceOffline")}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono tabular-nums">
                          {device.records.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[11px] tabular-nums">
                          {oldest.hasValue ? oldest.text : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 pe-5 text-[11px] tabular-nums sm:pe-6">
                          {newest.hasValue ? newest.text : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Link
          to="/history"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t("browseHistory")}
        </Link>
      </section>
    </div>
  );
}
