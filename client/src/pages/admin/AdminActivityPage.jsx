import { useCallback, useState } from "react";
import { Activity, RotateCcw } from "lucide-react";
import Pagination from "../../components/ui/Pagination";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../../components/ui/StateViews";
import { fetchAuditLog } from "../../services/adminApi";
import useAsyncData from "../../hooks/useAsyncData";
import { useLanguage } from "../../context/LanguageContext";
import { formatTimestamp } from "../../utils/telemetryFormat";
import { auditActionKey, formatAuditMetadata } from "../../utils/auditCatalog";

const EMPTY_FILTERS = { action: "", actorEmail: "", from: "", to: "" };

export default function AdminActivityPage() {
  const { t, language } = useLanguage();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const loadAuditLog = useCallback(() => {
    const params = { page, limit: 25 };
    if (appliedFilters.action) params.action = appliedFilters.action;
    if (appliedFilters.actorEmail) params.actorEmail = appliedFilters.actorEmail;
    // Date inputs give a bare date; `to` is widened to the end of that day so
    // "to: today" includes today's entries rather than only midnight.
    if (appliedFilters.from) {
      params.from = new Date(`${appliedFilters.from}T00:00:00`).toISOString();
    }
    if (appliedFilters.to) {
      params.to = new Date(`${appliedFilters.to}T23:59:59.999`).toISOString();
    }
    return fetchAuditLog(params);
  }, [appliedFilters, page]);

  const { data, isLoading, error, retry } = useAsyncData(
    loadAuditLog,
    [appliedFilters, page],
    { fallbackMessage: "Unable to load the activity log." }
  );

  const entries = data?.entries ?? [];
  const pagination = data?.pagination ?? null;
  const availableActions = data?.availableActions ?? [];

  const inputClasses =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-900/30";

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedFilters(filters);
        }}
        className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("action")}
            </span>
            <select
              value={filters.action}
              onChange={(event) => setFilters({ ...filters, action: event.target.value })}
              className={inputClasses}
            >
              <option value="">{t("allActions")}</option>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {t(auditActionKey(action))}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("actor")}
            </span>
            <input
              type="search"
              value={filters.actorEmail}
              onChange={(event) => setFilters({ ...filters, actorEmail: event.target.value })}
              placeholder={t("filterByEmail")}
              className={inputClasses}
            />
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("fromDate")}
            </span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
              className={inputClasses}
            />
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("toDate")}
            </span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
              className={inputClasses}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50"
          >
            {t("applyFilters")}
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setAppliedFilters(EMPTY_FILTERS);
              setPage(1);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw size={13} aria-hidden="true" />
            {t("reset")}
          </button>
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
        {isLoading && <TableSkeleton rows={6} columns={4} />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
        )}

        {!isLoading && !error && entries.length === 0 && (
          <EmptyState
            icon={Activity}
            title={t("noActivityTitle")}
            description={t("noActivityDesc")}
          />
        )}

        {!isLoading && !error && entries.length > 0 && (
          <>
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[48rem] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th scope="col" className="px-3 py-3 text-start ps-5 sm:ps-6">{t("timestamp")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("action")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("actor")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("target")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("details")}</th>
                    <th scope="col" className="px-3 py-3 text-start pe-5 sm:pe-6">{t("ipAddress")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700 dark:divide-slate-800/60 dark:text-slate-300">
                  {entries.map((entry) => {
                    const timestamp = formatTimestamp(entry.createdAt, { locale: language });
                    const details = formatAuditMetadata(entry.metadata);

                    return (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap px-3 py-3 ps-5 tabular-nums sm:ps-6">
                          {timestamp.text}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {t(auditActionKey(entry.action))}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="block truncate">
                            {entry.actorEmail ?? (
                              <span className="text-slate-400">{t("system")}</span>
                            )}
                          </span>
                          {entry.actorRole && (
                            <span className="block text-[10px] font-bold uppercase text-slate-400">
                              {entry.actorRole === "admin" ? t("adminRole") : t("userRole")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="block truncate">
                            {entry.targetLabel ?? entry.targetId ?? (
                              <span className="text-slate-400">—</span>
                            )}
                          </span>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            {entry.targetType}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {/* Metadata is stripped of credential-shaped keys by
                              the audit service before it is ever stored. */}
                          <span className="block max-w-[16rem] truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {details || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 pe-5 font-mono text-[10px] sm:pe-6">
                          {entry.ip ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <Pagination pagination={pagination} onPageChange={setPage} disabled={isLoading} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
