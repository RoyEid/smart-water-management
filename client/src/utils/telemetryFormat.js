/**
 * Formatting rules for telemetry values.
 *
 * The single rule this module exists to enforce: a value that was not measured
 * is never rendered as a number. No 0, no 50, no "--%" that reads like a real
 * reading. Callers get an explicit { hasValue, text } so they can style the
 * placeholder differently from a real measurement, and 0 and false — both
 * legitimate readings — survive intact.
 */

// The physical upper-tank capacity, matching UPPER_TANK_CAPACITY_LITRES in the
// firmware and the backend. Volume is derived from it, never measured directly.
export const TANK_CAPACITY_LITRES = 8.0;

// Thresholds mirrored from the firmware so the UI explains the rules the
// hardware actually applies. Read-only: the firmware owns these values.
export const PUMP_START_UPPER_LEVEL = 20.0;
export const PUMP_STOP_UPPER_LEVEL = 90.0;
export const PUMP_START_LOWER_MIN_LEVEL = 20.0;
export const PUMP_SAFETY_STOP_LOWER_LEVEL = 10.0;

export function hasValue(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * @returns {{ hasValue: boolean, value: number|null, text: string }}
 */
export function formatNumber(value, { decimals = 1, unit = "", placeholder } = {}) {
  if (!hasValue(value)) {
    return { hasValue: false, value: null, text: placeholder ?? "—" };
  }

  const text = unit
    ? `${value.toFixed(decimals)} ${unit}`
    : value.toFixed(decimals);

  return { hasValue: true, value, text };
}

export function formatPercentage(value, { decimals = 1, placeholder } = {}) {
  if (!hasValue(value)) {
    return { hasValue: false, value: null, text: placeholder ?? "—" };
  }
  return { hasValue: true, value, text: `${value.toFixed(decimals)}%` };
}

/**
 * Volume is derived from the level percentage and the fixed 8 L capacity — the
 * hardware has no volume sensor. A missing level therefore yields a missing
 * volume rather than 0 L.
 */
export function litresFromPercentage(percentage) {
  if (!hasValue(percentage)) return null;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  return (clamped / 100) * TANK_CAPACITY_LITRES;
}

export function formatVolume(percentage, { decimals = 2, placeholder } = {}) {
  const litres = litresFromPercentage(percentage);
  if (litres === null) {
    return { hasValue: false, value: null, text: placeholder ?? "—" };
  }
  return { hasValue: true, value: litres, text: `${litres.toFixed(decimals)} L` };
}

export function formatTimestamp(value, { placeholder = "—", locale } = {}) {
  if (!value) return { hasValue: false, text: placeholder };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { hasValue: false, text: placeholder };
  return { hasValue: true, text: date.toLocaleString(locale), date };
}

export function formatTime(value, { placeholder = "—", locale } = {}) {
  if (!value) return { hasValue: false, text: placeholder };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { hasValue: false, text: placeholder };
  return { hasValue: true, text: date.toLocaleTimeString(locale), date };
}

/**
 * "3 minutes ago" style age, used to make staleness obvious at a glance.
 * Returns null when there is no timestamp — the caller then shows its own
 * placeholder rather than "just now", which would be a lie.
 */
export function formatRelativeAge(value, t) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 10) return t("justNow");
  if (seconds < 60) return t("secondsAgo", { count: seconds });

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("minutesAgo", { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });

  const days = Math.floor(hours / 24);
  return t("daysAgo", { count: days });
}

/**
 * Tank status strings come from the firmware as fixed English identifiers.
 * Mapping them to translation keys here keeps the firmware contract untouched
 * while still letting the UI speak the user's language.
 */
export function tankStatusKey(status) {
  const map = {
    Empty: "statusEmpty",
    Low: "statusLow",
    Normal: "statusNormal",
    High: "statusHigh",
    Full: "statusFull",
    "Sensor Error": "statusSensorError",
    Offline: "statusOffline",
  };
  return map[status] ?? null;
}
