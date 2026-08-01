import { Link } from "react-router-dom";
import {
  Activity,
  BellRing,
  Cpu,
  Database,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/ui/StateViews";
import { fetchAdminOverview } from "../../services/adminApi";
import useAsyncData from "../../hooks/useAsyncData";
import { useLanguage } from "../../context/LanguageContext";
import { formatRelativeAge, formatTimestamp } from "../../utils/telemetryFormat";
import { auditActionKey } from "../../utils/auditCatalog";

export default function AdminOverviewPage() {
  const { t, language } = useLanguage();
  const { data, isLoading, error, retry } = useAsyncData(fetchAdminOverview, [], {
    fallbackMessage: "Unable to load the admin overview.",
  });

  // Error is checked first: a failed request leaves data null, so the loading
  // branch below would otherwise show a skeleton forever instead of the error.
  if (error) {
    return <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />;
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} rows={1} />
        ))}
      </div>
    );
  }

  const { stats, recentUsers, recentActivity } = data;
  const latestTelemetry = formatTimestamp(stats.telemetry.latestAt, { locale: language });

  return (
    <div className="space-y-6">
      {/* Every figure below is counted from the database or read from the live
          telemetry service — none of it is a placeholder constant. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label={t("totalUsers")}
          value={stats.users.total}
          accent="blue"
        />
        <StatCard
          icon={UserCheck}
          label={t("verifiedUsers")}
          value={stats.users.verified}
          accent="emerald"
        />
        <StatCard
          icon={UserX}
          label={t("unverifiedUsers")}
          value={stats.users.unverified}
          accent="amber"
        />
        <StatCard
          icon={ShieldCheck}
          label={t("administrators")}
          value={stats.users.admins}
          accent="indigo"
        />
        <StatCard
          icon={Cpu}
          label={t("activeDevices")}
          value={stats.devices.online}
          detail={t("ofTotalDevices", { total: stats.devices.total })}
          accent="emerald"
        />
        <StatCard
          icon={Cpu}
          label={t("offlineDevices")}
          value={stats.devices.offline}
          accent="amber"
        />
        <StatCard
          icon={Database}
          label={t("telemetryRecords")}
          value={stats.telemetry.totalRecords}
          detail={
            latestTelemetry.hasValue
              ? t("latestAt", { time: latestTelemetry.text })
              : t("noTelemetryYet")
          }
          accent="violet"
        />
        <StatCard
          icon={BellRing}
          label={t("openAlerts")}
          value={stats.alerts.open}
          detail={t("criticalCount", { count: stats.alerts.critical })}
          accent={stats.alerts.critical > 0 ? "rose" : "blue"}
        />
      </section>

      {/* Live pump and system state */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {t("systemState")}
        </h3>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
          <StateRow
            label={t("pumpState")}
            value={
              stats.pump.status
                ? stats.pump.status === "ON"
                  ? t("on")
                  : t("off")
                : t("waitingForData")
            }
            missing={!stats.pump.status}
            tone={stats.pump.status === "ON" ? "good" : "neutral"}
          />
          <StateRow
            label={t("controlMode")}
            value={t(stats.pump.mode === "MANUAL" ? "manual" : "auto")}
          />
          <StateRow
            label={t("systemEnabledLabel")}
            value={stats.pump.systemEnabled ? t("enabled") : t("disabled")}
            tone={stats.pump.systemEnabled ? "good" : "bad"}
          />
          <StateRow
            label={t("manualCommand")}
            value={stats.pump.manualPumpState === "ON" ? t("on") : t("off")}
          />
          <StateRow
            label={t("deviceState")}
            value={stats.pump.deviceOnline ? t("deviceOnline") : t("deviceOffline")}
            tone={stats.pump.deviceOnline ? "good" : "bad"}
          />
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent users */}
        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {t("recentUsers")}
            </h3>
            <Link
              to="/admin/users"
              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 dark:text-cyan-400 dark:hover:bg-blue-950/40"
            >
              {t("viewAll")}
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <p className="mt-4 text-xs font-bold text-slate-400">{t("noUsersYet")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-[10px] font-extrabold text-white">
                    {(user.name || user.email).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {user.name}
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RoleChip role={user.role} t={t} />
                    {!user.isVerified && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                        {t("unverified")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {t("recentActivity")}
            </h3>
            <Link
              to="/admin/activity"
              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 dark:text-cyan-400 dark:hover:bg-blue-950/40"
            >
              {t("viewAll")}
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={Activity}
                title={t("noActivityTitle")}
                description={t("noActivityDesc")}
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {t(auditActionKey(entry.action))}
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {entry.actorEmail ?? t("system")}
                      {entry.targetLabel && entry.targetLabel !== entry.actorEmail
                        ? ` → ${entry.targetLabel}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">
                    {formatRelativeAge(entry.createdAt, t)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const ACCENTS = {
  blue: "bg-blue-50 text-blue-600 ring-blue-200/60 dark:bg-blue-950/80 dark:text-cyan-400 dark:ring-blue-800/60",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200/60 dark:bg-emerald-950/80 dark:text-emerald-400 dark:ring-emerald-800/60",
  amber: "bg-amber-50 text-amber-600 ring-amber-200/60 dark:bg-amber-950/80 dark:text-amber-400 dark:ring-amber-800/60",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-200/60 dark:bg-indigo-950/80 dark:text-indigo-400 dark:ring-indigo-800/60",
  violet: "bg-violet-50 text-violet-600 ring-violet-200/60 dark:bg-violet-950/80 dark:text-violet-400 dark:ring-violet-800/60",
  rose: "bg-rose-50 text-rose-600 ring-rose-200/60 dark:bg-rose-950/80 dark:text-rose-400 dark:ring-rose-800/60",
};

function StatCard({ icon: Icon, label, value, detail, accent = "blue" }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 truncate text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
            {value.toLocaleString()}
          </p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${ACCENTS[accent]}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      {detail && (
        <p className="mt-3 truncate border-t border-slate-100/80 pt-3 text-[11px] font-semibold text-slate-400 dark:border-slate-800/80 dark:text-slate-500">
          {detail}
        </p>
      )}
    </article>
  );
}

const TONE_CLASSES = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-800 dark:text-slate-200",
};

function StateRow({ label, value, tone = "neutral", missing = false }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate text-sm font-extrabold ${
          missing ? "text-slate-400 dark:text-slate-500" : TONE_CLASSES[tone]
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function RoleChip({ role, t }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
        role === "admin"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-cyan-300"
          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      }`}
    >
      {role === "admin" ? t("adminRole") : t("userRole")}
    </span>
  );
}
