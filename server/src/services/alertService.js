import Alert, { ALERT_CODES } from "../models/Alert.js";
import { emitAlertCreated, emitAlertResolved } from "../realtime/socketServer.js";
const LOWER_CRITICAL_LEVEL = 10.0; // LOWER_STOP_LEVEL
const UPPER_FULL_LEVEL = 90.0; // UPPER_PUMP_OFF_LEVEL
const DEVICE_OFFLINE_MS = 20_000;

const TOUCH_INTERVAL_MS = 60_000;


const openAlerts = new Map(); // deviceId -> Map<code, { id, lastTouchedAt }>

function getDeviceMap(deviceId) {
  if (!openAlerts.has(deviceId)) {
    openAlerts.set(deviceId, new Map());
  }
  return openAlerts.get(deviceId);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function deriveConditions(reading, { isOnline }) {
  const conditions = [];

  if (!reading) return conditions;

  const upper = reading.upperTank;
  const lower = reading.lowerTank;

  if (!isOnline) {
    conditions.push({
      code: ALERT_CODES.DEVICE_OFFLINE,
      severity: "critical",
      message:
        "The ESP32 has not reported telemetry for more than 20 seconds. The pump is held OFF until it reports again.",
      context: { lastSeenAt: reading.receivedAt },
    });

    return conditions;
  }

  const upperInvalid = !isFiniteNumber(upper?.percentage);
  const lowerInvalid = !isFiniteNumber(lower?.percentage);

  if (upperInvalid || lowerInvalid) {
    conditions.push({
      code: ALERT_CODES.INVALID_TELEMETRY,
      severity: "warning",
      message:
        "The last reading arrived without usable tank levels. Values are shown as unavailable rather than guessed.",
      context: { upperInvalid, lowerInvalid },
    });
  }

  if (upper?.tankStatus === "Sensor Error" || reading.failedSensor === "UPPER") {
    conditions.push({
      code: ALERT_CODES.UPPER_SENSOR_ERROR,
      severity: "critical",
      message:
        "The upper-tank ultrasonic sensor (TRIG 7 / ECHO 15) returned no valid distance.",
      context: { failedSensor: "UPPER" },
    });
  }

  if (lower?.tankStatus === "Sensor Error" || reading.failedSensor === "LOWER") {
    conditions.push({
      code: ALERT_CODES.LOWER_SENSOR_ERROR,
      severity: "critical",
      message:
        "The lower-tank ultrasonic sensor (TRIG 12 / ECHO 13) returned no valid distance.",
      context: { failedSensor: "LOWER" },
    });
  }

  if (isFiniteNumber(lower?.percentage) && lower.percentage <= LOWER_CRITICAL_LEVEL) {
    conditions.push({
      code: ALERT_CODES.LOWER_TANK_CRITICAL,
      severity: "critical",
      message: `The lower (source) tank is at ${lower.percentage.toFixed(1)}%, at or below the ${LOWER_CRITICAL_LEVEL}% dry-run limit. Refill the source reservoir.`,
      context: { level: lower.percentage, threshold: LOWER_CRITICAL_LEVEL },
    });

    conditions.push({
      code: ALERT_CODES.PUMP_BLOCKED,
      severity: "warning",
      message:
        "Dry-run protection is holding the pump OFF because the lower tank is at or below the safety level.",
      context: { reason: "LOWER_TANK_CRITICAL", level: lower.percentage },
    });
  }

  if (isFiniteNumber(upper?.percentage) && upper.percentage >= UPPER_FULL_LEVEL) {
    conditions.push({
      code: ALERT_CODES.UPPER_TANK_FULL,
      severity: "info",
      message: `The upper (destination) tank has reached ${upper.percentage.toFixed(1)}%, at or above the ${UPPER_FULL_LEVEL}% stop level. The fill cycle is complete.`,
      context: { level: upper.percentage, threshold: UPPER_FULL_LEVEL },
    });
  }

  if (reading.systemEnabled === false) {
    conditions.push({
      code: ALERT_CODES.SYSTEM_DISABLED,
      severity: "warning",
      message:
        "The system is disabled from the remote controls. The pump will not run in either AUTO or MANUAL mode.",
      context: {},
    });
  }

  return conditions;
}

export async function syncAlerts(reading, { isOnline }) {
  if (!reading?.deviceId) return;

  const deviceId = reading.deviceId;

  try {
    const conditions = deriveConditions(reading, { isOnline });
    const activeCodes = new Set(conditions.map((condition) => condition.code));
    const openForDevice = getDeviceMap(deviceId);
    const now = Date.now();

    for (const condition of conditions) {
      const existing = openForDevice.get(condition.code);

      if (!existing) {
        const created = await Alert.create({
          deviceId,
          code: condition.code,
          severity: condition.severity,
          message: condition.message,
          context: condition.context ?? {},
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          occurrences: 1,
        });

        openForDevice.set(condition.code, {
          id: created._id,
          lastTouchedAt: now,
        });
        emitAlertCreated(created.toObject());
        continue;
      }

      if (now - existing.lastTouchedAt >= TOUCH_INTERVAL_MS) {
        existing.lastTouchedAt = now;
        await Alert.updateOne(
          { _id: existing.id },
          { $set: { lastSeenAt: new Date() }, $inc: { occurrences: 1 } }
        );
      }
    }

    for (const [code, entry] of openForDevice.entries()) {
      if (activeCodes.has(code)) continue;

      openForDevice.delete(code);
      const resolvedAt = new Date();
      await Alert.updateOne(
        { _id: entry.id },
        { $set: { isResolved: true, resolvedAt } }
      );
      emitAlertResolved({ id: String(entry.id), deviceId, code, resolvedAt });
    }
  } catch (error) {
    console.error(`[Alerts] Failed to sync alerts for ${deviceId}:`, error.message);
  }
}

export async function hydrateOpenAlerts() {
  try {
    const open = await Alert.find({ isResolved: false })
      .select("_id deviceId code")
      .lean();

    openAlerts.clear();
    for (const alert of open) {
      getDeviceMap(alert.deviceId).set(alert.code, {
        id: alert._id,

        lastTouchedAt: 0,
      });
    }

    console.log(`[Alerts] Restored ${open.length} open alert(s) from MongoDB.`);
    return open.length;
  } catch (error) {
    console.error("[Alerts] Failed to restore open alerts:", error.message);
    return 0;
  }
}

export async function sweepOfflineDevices(getLatest) {
  const reading = getLatest();
  if (!reading?.receivedAt) return;

  const age = Date.now() - new Date(reading.receivedAt).getTime();
  const isOnline = age < DEVICE_OFFLINE_MS;

  if (isOnline) return;

  await syncAlerts(reading, { isOnline: false });
}

export { DEVICE_OFFLINE_MS, LOWER_CRITICAL_LEVEL, UPPER_FULL_LEVEL };
