import { CheckCircle2, Cog, Cpu, XCircle } from "lucide-react";
import { CardSkeleton, ErrorState } from "../../components/ui/StateViews";
import { fetchSystemConfig } from "../../services/adminApi";
import useAsyncData from "../../hooks/useAsyncData";
import { useLanguage } from "../../context/LanguageContext";
import { formatTimestamp } from "../../utils/telemetryFormat";

/**
 * Read-only view of the runtime configuration.
 *
 * Secrets are reported as configured / not configured only — the backend never
 * sends their values, so there is nothing here to leak even in a screenshot.
 * The hardware constants are a mirror of the firmware, shown so an admin can
 * confirm the dashboard and the device agree; changing them requires reflashing.
 */
export default function AdminConfigPage() {
  const { t, language } = useLanguage();
  const { data, isLoading, error, retry } = useAsyncData(fetchSystemConfig, [], {
    fallbackMessage: "Unable to load system configuration.",
  });

  // Error first: a failed request leaves data null, and the loading branch
  // below would otherwise hold a skeleton on screen instead of the error.
  if (error) {
    return <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />;
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={6} />
      </div>
    );
  }

  const { config, hardware, runtime } = data;
  const latest = formatTimestamp(runtime.latestTelemetryAt, { locale: language });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card icon={Cog} title={t("serverConfiguration")} description={t("serverConfigDesc")}>
        <dl className="space-y-3">
          <TextRow label={t("environment")} value={config.environment} mono />
          <BooleanRow label={t("deviceApiKey")} ok={config.deviceApiKeyConfigured} t={t} />
          <BooleanRow label={t("jwtSecret")} ok={config.jwtConfigured} t={t} />
          <TextRow label={t("emailMode")} value={config.emailMode} mono />
          <BooleanRow label={t("googleOAuth")} ok={config.googleOAuthConfigured} t={t} />
          <BooleanRow label={t("githubOAuth")} ok={config.githubOAuthConfigured} t={t} />
          <TextRow label={t("frontendUrl")} value={config.frontendUrl ?? t("notSet")} mono />
          <TextRow label={t("cookieSameSite")} value={config.cookieSameSite} mono />
          <BooleanRow label={t("trustProxy")} ok={config.trustProxy} t={t} neutral />
        </dl>
      </Card>

      <Card icon={Cpu} title={t("hardwareConstants")} description={t("hardwareConstantsDesc")}>
        <dl className="space-y-3">
          <TextRow
            label={t("tankCapacity")}
            value={`${hardware.upperTankCapacityLitres.toFixed(1)} L`}
            mono
          />
          <TextRow
            label={t("pumpStartUpper")}
            value={`≤ ${hardware.pumpStartUpperLevel}%`}
            mono
          />
          <TextRow
            label={t("pumpStopUpper")}
            value={`≥ ${hardware.pumpStopUpperLevel}%`}
            mono
          />
          <TextRow
            label={t("pumpStartLowerMin")}
            value={`≥ ${hardware.pumpStartLowerMinLevel}%`}
            mono
          />
          <TextRow
            label={t("pumpSafetyStopLower")}
            value={`≤ ${hardware.pumpSafetyStopLowerLevel}%`}
            mono
          />
          <TextRow
            label={t("onlineWindow")}
            value={`${hardware.deviceOnlineWindowMs / 1000} s`}
            mono
          />
        </dl>

        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] font-semibold leading-relaxed text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
          {t("hardwareReadOnlyNotice")}
        </p>
      </Card>

      <Card icon={Cog} title={t("runtimeState")} description={t("runtimeStateDesc")}>
        <dl className="space-y-3">
          <TextRow
            label={t("uptime")}
            value={formatUptime(runtime.uptimeSeconds, t)}
            mono
          />
          <TextRow
            label={t("controlMode")}
            value={t(runtime.control.pumpMode === "MANUAL" ? "manual" : "auto")}
          />
          <TextRow
            label={t("systemEnabledLabel")}
            value={runtime.control.systemEnabled ? t("enabled") : t("disabled")}
          />
          <TextRow
            label={t("manualCommand")}
            value={runtime.control.manualPumpState === "ON" ? t("on") : t("off")}
          />
          <TextRow
            label={t("latestTelemetry")}
            value={latest.hasValue ? latest.text : t("noTelemetryYet")}
          />
          <BooleanRow label={t("deviceState")} ok={runtime.deviceOnline} t={t} />
        </dl>
      </Card>
    </div>
  );
}

function formatUptime(seconds, t) {
  if (!Number.isFinite(seconds)) return t("notAvailable");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function Card({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-cyan-400">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-b-0 dark:border-slate-800/60">
      <dt className="min-w-0 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        className={`min-w-0 truncate text-end text-xs font-extrabold text-slate-800 dark:text-slate-200 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function BooleanRow({ label, ok, t, neutral = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-b-0 dark:border-slate-800/60">
      <dt className="min-w-0 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-extrabold ${
          ok
            ? "text-emerald-600 dark:text-emerald-400"
            : neutral
            ? "text-slate-500 dark:text-slate-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {ok ? (
          <CheckCircle2 size={14} aria-hidden="true" />
        ) : (
          <XCircle size={14} aria-hidden="true" />
        )}
        {ok ? t("configured") : t("notConfigured")}
      </dd>
    </div>
  );
}
