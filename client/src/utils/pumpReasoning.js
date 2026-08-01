import {
  hasValue,
  PUMP_SAFETY_STOP_LOWER_LEVEL,
  PUMP_START_LOWER_MIN_LEVEL,
  PUMP_START_UPPER_LEVEL,
  PUMP_STOP_UPPER_LEVEL,
  // Explicit extension so this module also resolves under plain Node, which
  // runs the unit tests; Vite resolves it either way.
} from "./telemetryFormat.js";

/**
 * Explains why the pump is in the state it is in.
 *
 * This is a *description* of the firmware's decision, never a controller: the
 * ESP32 owns the pump and applies these same thresholds itself. Keeping the
 * explanation in one module means the dashboard card and the pump control page
 * can never tell the user two different stories about the same reading.
 *
 * Returns a translation key plus parameters rather than a sentence, so the
 * reasoning is available in all three languages.
 */
export function derivePumpReasoning({ reading, controlState, isOnline }) {
  const upperLevel = reading?.upperTank?.percentage;
  const lowerLevel = reading?.lowerTank?.percentage;
  const pumpStatus = reading?.pumpStatus ?? null;
  const systemEnabled = controlState?.systemEnabled;
  const pumpMode = controlState?.pumpMode ?? reading?.pumpMode ?? null;

  // Ordered by precedence: the first condition that applies is the operative
  // one, and safety conditions outrank operational ones.
  if (!reading) {
    return { key: "reasonNoTelemetry", params: {}, tone: "info", blocked: true };
  }

  if (!isOnline) {
    return { key: "reasonOffline", params: {}, tone: "error", blocked: true };
  }

  if (
    reading.upperTank?.tankStatus === "Sensor Error" ||
    reading.lowerTank?.tankStatus === "Sensor Error"
  ) {
    return { key: "reasonSensorError", params: {}, tone: "error", blocked: true };
  }

  if (!hasValue(upperLevel) || !hasValue(lowerLevel)) {
    return { key: "reasonInvalidTelemetry", params: {}, tone: "error", blocked: true };
  }

  if (lowerLevel <= PUMP_SAFETY_STOP_LOWER_LEVEL) {
    return {
      key: "reasonDryRun",
      params: {
        level: lowerLevel.toFixed(1),
        threshold: PUMP_SAFETY_STOP_LOWER_LEVEL,
      },
      tone: "error",
      blocked: true,
    };
  }

  if (systemEnabled === false) {
    return { key: "reasonSystemDisabled", params: {}, tone: "warning", blocked: true };
  }

  if (upperLevel >= PUMP_STOP_UPPER_LEVEL) {
    return {
      key: "reasonUpperFull",
      params: { level: upperLevel.toFixed(1), threshold: PUMP_STOP_UPPER_LEVEL },
      tone: "info",
      blocked: true,
    };
  }

  if (pumpMode === "MANUAL") {
    return pumpStatus === "ON"
      ? { key: "reasonManualOn", params: {}, tone: "success", blocked: false }
      : { key: "reasonManualStandby", params: {}, tone: "info", blocked: false };
  }

  // AUTO mode from here down.
  if (pumpStatus === "ON") {
    return {
      key: "reasonAutoRunning",
      params: { level: upperLevel.toFixed(1), threshold: PUMP_STOP_UPPER_LEVEL },
      tone: "success",
      blocked: false,
    };
  }

  if (lowerLevel < PUMP_START_LOWER_MIN_LEVEL) {
    return {
      key: "reasonLowerBelowStart",
      params: {
        level: lowerLevel.toFixed(1),
        threshold: PUMP_START_LOWER_MIN_LEVEL,
      },
      tone: "warning",
      blocked: true,
    };
  }

  if (upperLevel > PUMP_START_UPPER_LEVEL) {
    return {
      key: "reasonAutoIdle",
      params: { level: upperLevel.toFixed(1), threshold: PUMP_START_UPPER_LEVEL },
      tone: "info",
      blocked: false,
    };
  }

  return {
    key: "reasonAutoReadyToStart",
    params: { level: upperLevel.toFixed(1), threshold: PUMP_START_UPPER_LEVEL },
    tone: "info",
    blocked: false,
  };
}

/**
 * The safety interlocks, each with its own pass/fail/unknown state, for the
 * checklist on the pump control page.
 *
 * "unknown" is a distinct third state on purpose — an interlock whose input is
 * missing must not be drawn as satisfied.
 */
export function deriveSafetyChecks({ reading, controlState, isOnline }) {
  const upperLevel = reading?.upperTank?.percentage;
  const lowerLevel = reading?.lowerTank?.percentage;

  const sensorsHealthy =
    reading?.upperTank?.tankStatus !== "Sensor Error" &&
    reading?.lowerTank?.tankStatus !== "Sensor Error";

  const checks = [
    {
      id: "deviceOnline",
      labelKey: "safetyDeviceOnline",
      descriptionKey: "safetyDeviceOnlineDesc",
      state: isOnline ? "pass" : "fail",
    },
    {
      id: "sensors",
      labelKey: "safetySensors",
      descriptionKey: "safetySensorsDesc",
      state: !reading ? "unknown" : sensorsHealthy ? "pass" : "fail",
    },
    {
      id: "lowerLevel",
      labelKey: "safetyLowerLevel",
      descriptionKey: "safetyLowerLevelDesc",
      state: !hasValue(lowerLevel)
        ? "unknown"
        : lowerLevel > PUMP_SAFETY_STOP_LOWER_LEVEL
        ? "pass"
        : "fail",
      params: { threshold: PUMP_SAFETY_STOP_LOWER_LEVEL },
    },
    {
      id: "upperHeadroom",
      labelKey: "safetyUpperHeadroom",
      descriptionKey: "safetyUpperHeadroomDesc",
      state: !hasValue(upperLevel)
        ? "unknown"
        : upperLevel < PUMP_STOP_UPPER_LEVEL
        ? "pass"
        : "fail",
      params: { threshold: PUMP_STOP_UPPER_LEVEL },
    },
    {
      id: "systemEnabled",
      labelKey: "safetySystemEnabled",
      descriptionKey: "safetySystemEnabledDesc",
      state:
        controlState?.systemEnabled === undefined
          ? "unknown"
          : controlState.systemEnabled
          ? "pass"
          : "fail",
    },
  ];

  return checks;
}

/**
 * Whether a manual ON command can be issued at all.
 *
 * Manual mode may bypass the *start* conditions (that is what makes it manual),
 * but never the safety stops — the firmware will refuse a manual ON under a
 * dry-run or full-tank condition anyway, so offering the button would be
 * offering something that cannot happen.
 */
export function canCommandManualOn({ reading, controlState, isOnline }) {
  if (!isOnline) return { allowed: false, reasonKey: "blockOffline" };
  if (controlState?.systemEnabled === false) {
    return { allowed: false, reasonKey: "blockSystemDisabled" };
  }

  const lowerLevel = reading?.lowerTank?.percentage;
  const upperLevel = reading?.upperTank?.percentage;

  if (!hasValue(lowerLevel) || !hasValue(upperLevel)) {
    return { allowed: false, reasonKey: "blockInvalidTelemetry" };
  }

  if (
    reading?.upperTank?.tankStatus === "Sensor Error" ||
    reading?.lowerTank?.tankStatus === "Sensor Error"
  ) {
    return { allowed: false, reasonKey: "blockSensorError" };
  }

  if (lowerLevel <= PUMP_SAFETY_STOP_LOWER_LEVEL) {
    return { allowed: false, reasonKey: "blockDryRun" };
  }

  if (upperLevel >= PUMP_STOP_UPPER_LEVEL) {
    return { allowed: false, reasonKey: "blockUpperFull" };
  }

  return { allowed: true, reasonKey: null };
}
