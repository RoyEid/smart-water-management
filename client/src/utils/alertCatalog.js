/**
 * Maps the backend's stable alert codes to display metadata.
 *
 * The backend sends a code plus an English message describing the condition at
 * the moment it fired. The code drives the translated title and the icon; the
 * stored message stays as the factual detail, because it captures the actual
 * measured values at that moment and must not be regenerated later from
 * different data.
 */
export const ALERT_CODE_META = {
  DEVICE_OFFLINE: { titleKey: "alertDeviceOffline", severity: "critical" },
  UPPER_SENSOR_ERROR: { titleKey: "alertUpperSensorError", severity: "critical" },
  LOWER_SENSOR_ERROR: { titleKey: "alertLowerSensorError", severity: "critical" },
  LOWER_TANK_CRITICAL: { titleKey: "alertLowerTankCritical", severity: "critical" },
  PUMP_BLOCKED: { titleKey: "alertPumpBlocked", severity: "warning" },
  UPPER_TANK_FULL: { titleKey: "alertUpperTankFull", severity: "info" },
  SYSTEM_DISABLED: { titleKey: "alertSystemDisabled", severity: "warning" },
  INVALID_TELEMETRY: { titleKey: "alertInvalidTelemetry", severity: "warning" },
};

/**
 * Falls back to the raw code rather than throwing, so a code added on the
 * backend before the client knows about it still renders something honest.
 */
export function alertMessageKey(code) {
  return ALERT_CODE_META[code]?.titleKey ?? code;
}

export const ALERT_SEVERITIES = ["critical", "warning", "info"];
