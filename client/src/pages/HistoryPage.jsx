import { useCallback, useState } from "react";
import { Download, History, LoaderCircle, RotateCcw } from "lucide-react";
import Pagination from "../components/ui/Pagination";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../components/ui/StateViews";
import { fetchDevices, fetchTelemetryHistory, exportTelemetryCsv } from "../services/deviceApi";
import useAsyncData from "../hooks/useAsyncData";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../utils/apiError";
import {
  formatPercentage,
  formatTimestamp,
  formatVolume,
  tankStatusKey,
} from "../utils/telemetryFormat";

const EMPTY_FILTERS = {
  deviceId: "",
  tank: "",
  pumpStatus: "",
  pumpMode: "",
  from: "",
  to: "",
};

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const toast = useToast();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Separate from `filters` so typing in a date field does not fire a request
  // per keystroke — the query only changes when the user applies it.
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // A failed device list only costs the filter dropdown; the history itself is
  // still usable, so its error is deliberately not surfaced as a page error.
  const { data: deviceData } = useAsyncData(fetchDevices, []);
  const devices = deviceData?.devices ?? [];

  /**
   * Empty strings are dropped rather than sent: the backend schema rejects an
   * empty enum value, and "no filter" is the absence of the parameter.
   */
  const buildParams = useCallback(
    (extra = {}) => {
      const params = { ...extra };
      for (const [key, value] of Object.entries(appliedFilters)) {
        if (value) params[key] = value;
      }
      // Date inputs give a bare date; `to` is widened to the end of that day so
      // "to: today" includes today's readings rather than only midnight.
      if (params.from) params.from = new Date(`${params.from}T00:00:00`).toISOString();
      if (params.to) params.to = new Date(`${params.to}T23:59:59.999`).toISOString();
      return params;
    },
    [appliedFilters]
  );

  const loadHistory = useCallback(
    () => fetchTelemetryHistory(buildParams({ page, limit: 25 })),
    [buildParams, page]
  );

  const { data, isLoading, error, retry } = useAsyncData(
    loadHistory,
    [appliedFilters, page],
    { fallbackMessage: "Unable to load telemetry history." }
  );

  const readings = data?.readings ?? [];
  const pagination = data?.pagination ?? null;

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // The export uses the same filters as the table, so the downloaded file
      // always matches what is on screen.
      const { blob, rowCount, truncated } = await exportTelemetryCsv(buildParams());

      // Object URL is revoked immediately after the click: leaving it alive
      // pins the blob in memory for the lifetime of the tab.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `telemetry-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(
        truncated
          ? t("exportTruncated", { count: rowCount })
          : t("exportComplete", { count: rowCount })
      );
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Unable to export telemetry."));
    } finally {
      setIsExporting(false);
    }
  };

  const inputClasses =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-900/30";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("storedTelemetry")}
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl dark:text-slate-100">
            {t("telemetryHistory")}
          </h2>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || readings.length === 0}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-blue-900/30"
        >
          {isExporting ? (
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Download size={14} aria-hidden="true" />
          )}
          {t("exportCsv")}
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field label={t("device")}>
            <select
              value={filters.deviceId}
              onChange={(event) => setFilters({ ...filters, deviceId: event.target.value })}
              className={inputClasses}
            >
              <option value="">{t("allDevices")}</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.displayName}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("tank")}>
            <select
              value={filters.tank}
              onChange={(event) => setFilters({ ...filters, tank: event.target.value })}
              className={inputClasses}
            >
              <option value="">{t("bothTanks")}</option>
              <option value="upper">{t("upperTank")}</option>
              <option value="lower">{t("lowerTank")}</option>
            </select>
          </Field>

          <Field label={t("pumpState")}>
            <select
              value={filters.pumpStatus}
              onChange={(event) => setFilters({ ...filters, pumpStatus: event.target.value })}
              className={inputClasses}
            >
              <option value="">{t("anyState")}</option>
              <option value="ON">{t("on")}</option>
              <option value="OFF">{t("off")}</option>
            </select>
          </Field>

          <Field label={t("controlMode")}>
            <select
              value={filters.pumpMode}
              onChange={(event) => setFilters({ ...filters, pumpMode: event.target.value })}
              className={inputClasses}
            >
              <option value="">{t("anyMode")}</option>
              <option value="AUTO">{t("auto")}</option>
              <option value="MANUAL">{t("manual")}</option>
            </select>
          </Field>

          <Field label={t("fromDate")}>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
              className={inputClasses}
            />
          </Field>

          <Field label={t("toDate")}>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
              className={inputClasses}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50 dark:focus-visible:ring-blue-900/40"
          >
            {t("applyFilters")}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw size={13} aria-hidden="true" />
            {t("reset")}
          </button>
        </div>
      </form>

      {/* Results */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
        {isLoading && <TableSkeleton rows={6} columns={5} />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
        )}

        {!isLoading && !error && readings.length === 0 && (
          <EmptyState
            icon={History}
            title={t("noHistoryTitle")}
            description={t("noHistoryDesc")}
          />
        )}

        {!isLoading && !error && readings.length > 0 && (
          <>
            {/* The table scrolls inside its own container so a wide row can
                never make the whole page scroll sideways on a phone. */}
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[52rem] border-collapse text-start">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <Th className="ps-5 sm:ps-6">{t("timestamp")}</Th>
                    <Th>{t("upperTankLevel")}</Th>
                    <Th>{t("upperTankVolume")}</Th>
                    <Th>{t("lowerTankLevel")}</Th>
                    <Th>{t("lowerTankVolume")}</Th>
                    <Th>{t("pumpState")}</Th>
                    <Th>{t("controlMode")}</Th>
                    <Th className="pe-5 sm:pe-6">{t("waterFlowStatus")}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {readings.map((entry) => {
                    const targetDevId = entry.deviceId || appliedFilters.deviceId || devices[0]?.deviceId;
                    const matchedDev = devices.find((d) => d.deviceId === targetDevId);
                    return (
                      <HistoryRow
                        key={entry.id}
                        entry={entry}
                        device={matchedDev}
                        t={t}
                        language={language}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                disabled={isLoading}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ entry, device, t, language }) {
  const timestamp = formatTimestamp(entry.receivedAt, { locale: language });
  const upperStatusKey = tankStatusKey(entry.upperTank?.tankStatus);
  const lowerStatusKey = tankStatusKey(entry.lowerTank?.tankStatus);
  const upperCap = device?.tanks?.upper?.capacityLiters;
  const lowerCap = device?.tanks?.lower?.capacityLiters;

  return (
    <tr className="text-xs font-semibold text-slate-700 transition hover:bg-slate-50/70 dark:text-slate-300 dark:hover:bg-slate-800/40">
      <Td className="ps-5 whitespace-nowrap tabular-nums sm:ps-6">
        {timestamp.hasValue ? timestamp.text : t("notAvailable")}
      </Td>
      <Td>
        <Cell
          formatted={formatPercentage(entry.upperTank?.percentage)}
          note={upperStatusKey ? t(upperStatusKey) : null}
          t={t}
        />
      </Td>
      <Td>
        <Cell
          formatted={formatVolume(entry.upperTank?.percentage, { capacityLiters: upperCap })}
          t={t}
        />
      </Td>
      <Td>
        <Cell
          formatted={formatPercentage(entry.lowerTank?.percentage)}
          note={lowerStatusKey ? t(lowerStatusKey) : null}
          t={t}
        />
      </Td>
      <Td>
        <Cell
          formatted={formatVolume(entry.lowerTank?.percentage, { capacityLiters: lowerCap })}
          t={t}
        />
      </Td>
      <Td>
        {entry.pumpStatus ? (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              entry.pumpStatus === "ON"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {entry.pumpStatus === "ON" ? t("on") : t("off")}
          </span>
        ) : (
          <MutedCell t={t} />
        )}
      </Td>
      <Td>
        {entry.pumpMode ? (
          t(entry.pumpMode === "MANUAL" ? "manual" : "auto")
        ) : (
          <MutedCell t={t} />
        )}
      </Td>
      <Td className="pe-5 sm:pe-6">
        {entry.waterFlowDetected === true ? (
          <span className="inline-flex rounded-full bg-cyan-100 dark:bg-cyan-950/70 px-2 py-0.5 text-[10px] font-extrabold text-cyan-700 dark:text-cyan-300">
            {t("waterFlowing")}
          </span>
        ) : entry.waterFlowDetected === false ? (
          <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {t("noWaterFlow")}
          </span>
        ) : (
          <MutedCell t={t} />
        )}
      </Td>
    </tr>
  );
}

function Cell({ formatted, note, t }) {
  if (!formatted.hasValue) return <MutedCell t={t} />;

  return (
    <span className="block">
      <span className="tabular-nums">{formatted.text}</span>
      {note && (
        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500">
          {note}
        </span>
      )}
    </span>
  );
}

function MutedCell({ t }) {
  return (
    <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600">
      {t("notAvailable")}
    </span>
  );
}

function Th({ children, className = "" }) {
  return (
    <th scope="col" className={`px-3 py-3 text-start font-extrabold ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-3 py-3 align-top ${className}`}>{children}</td>;
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
