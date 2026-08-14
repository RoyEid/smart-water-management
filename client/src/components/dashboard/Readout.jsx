import { useLanguage } from "../../context/LanguageContext";

/**
 * Renders one telemetry value, or an explicit placeholder when there is none.
 *
 * The whole point: a missing value is visibly missing. It is never substituted
 * with 0, 50, or a dash that could be mistaken for a measurement — the
 * placeholder is worded ("Waiting for data" / "Not available") and styled in a
 * muted colour so it cannot read as a reading.
 */
export default function Readout({
  formatted,
  placeholderKind = "waiting",
  size = "md",
  className = "",
}) {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl sm:text-4xl",
  }[size];

  if (!formatted?.hasValue) {
    const placeholderKey =
      placeholderKind === "unavailable" ? "notAvailable" : "waitingForData";
    const textToRender =
      formatted?.text && formatted.text !== "—"
        ? formatted.text === "Not configured"
          ? t("tankNotConfigured")
          : formatted.text
        : t(placeholderKey);

    return (
      <span
        className={`block truncate text-xs font-bold text-slate-400 dark:text-slate-500 ${className}`}
      >
        {textToRender}
      </span>
    );
  }

  return (
    <span
      // tabular-nums keeps the digits from shifting width as values update,
      // which otherwise makes a live number jitter left and right.
      className={`block truncate font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 ${sizeClasses} ${className}`}
    >
      {formatted.text}
    </span>
  );
}
