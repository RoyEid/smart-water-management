import UltrasonicReading from "../models/UltrasonicReading.js";
import { touchDevice } from "./deviceService.js";
import { syncAlerts } from "./alertService.js";

const ONLINE_WINDOW_MS = 10_000;

// Kept in memory so the dashboard and the ESP32 response path never wait on
// (or fail because of) MongoDB. Mongo is the durable copy, this is the hot one.
let latestReading = null;

function toTank(source, fallbackStatus) {
  return {
    distanceCm: Number(source?.distanceCm ?? 0),
    percentage: Number(source?.percentage ?? 0),
    waterHeightCm: Number(source?.waterHeightCm ?? 0),
    tankStatus: String(source?.tankStatus || fallbackStatus || "Normal"),
  };
}

/**
 * Builds the single normalized telemetry shape used by the HTTP response,
 * the Socket.IO event, and the MongoDB document, so the ESP32 payload names
 * and the dashboard field names can never drift apart.
 */
function normalizePayload(payload) {
  const {
    deviceId = "tank-01",
    upperTank,
    lowerTank,
    pumpStatus = "OFF",
    systemEnabled = true,
    pumpMode = "AUTO",
    sensorStatus,
    failedSensor,
    // YF-S201 binary flow telemetry
    waterFlowDetected,
    // Single-tank backward compatibility fields:
    distanceCm,
    percentage,
    waterHeightCm,
    tankStatus,
  } = payload;

  const singleTankFallback = { distanceCm, percentage, waterHeightCm, tankStatus };

  const resolvedUpper = toTank(upperTank || singleTankFallback, "Normal");
  const resolvedLower = toTank(lowerTank || singleTankFallback, "Normal");

  if (sensorStatus === "ERROR") {
    if (failedSensor === "UPPER" || !failedSensor) {
      resolvedUpper.tankStatus = "Sensor Error";
    }
    if (failedSensor === "LOWER" || !failedSensor) {
      resolvedLower.tankStatus = "Sensor Error";
    }
  }

  const resolvedPumpStatus = String(pumpStatus || "OFF");
  const receivedAt = new Date();

  return {
    deviceId,
    upperTank: resolvedUpper,
    lowerTank: resolvedLower,
    pumpStatus: resolvedPumpStatus,
    pumpRunning: resolvedPumpStatus === "ON",
    systemEnabled: Boolean(systemEnabled ?? true),
    pumpMode: String(pumpMode || "AUTO"),
    sensorStatus: sensorStatus ? String(sensorStatus) : null,
    failedSensor: failedSensor ? String(failedSensor) : null,
    waterFlowDetected: normalizeWaterFlowDetected(waterFlowDetected),
    receivedAt,
  };
}

/**
 * Normalizes binary water flow presence telemetry.
 * Distinguishes true, false, and null (missing/waiting data).
 */
function normalizeWaterFlowDetected(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

export function saveLatestReading(payload) {
  latestReading = normalizePayload(payload);

  // Persist without blocking the device response. A MongoDB problem must
  // degrade durability only — it must never turn a good reading into an error
  // for the ESP32 or stall the live dashboard update.
  UltrasonicReading.create(latestReading).catch((error) => {
    console.error("[Ultrasonic] Failed to persist reading:", error.message);
  });

  const serialized = serializeReading(latestReading);

  // Registry and alerting are downstream consumers of the reading, held to the
  // same rule: both swallow their own failures so neither can turn a valid
  // device POST into an error. A reading that arrived is always accepted.
  touchDevice(serialized);
  syncAlerts(serialized, { isOnline: true });

  return serialized;
}

export function getLatestReading() {
  if (!latestReading) {
    return null;
  }

  return withOnlineStatus(serializeReading(latestReading));
}

/**
 * Restores the last stored reading after a backend restart so the dashboard
 * shows real history instead of "Awaiting Data". The online/offline decision
 * still comes from the reading's own timestamp, so a stale restored reading
 * correctly reports the device as offline.
 */
export async function hydrateLatestReading() {
  try {
    const stored = await UltrasonicReading.findOne()
      .sort({ receivedAt: -1 })
      .lean();

    if (!stored) {
      console.log("[Ultrasonic] No stored readings found in MongoDB.");
      return null;
    }

    latestReading = {
      deviceId: stored.deviceId,
      upperTank: toTank(stored.upperTank),
      lowerTank: toTank(stored.lowerTank),
      pumpStatus: stored.pumpStatus,
      pumpRunning: stored.pumpRunning ?? stored.pumpStatus === "ON",
      systemEnabled: stored.systemEnabled,
      pumpMode: stored.pumpMode,
      sensorStatus: stored.sensorStatus ?? null,
      failedSensor: stored.failedSensor ?? null,
      waterFlowDetected: normalizeWaterFlowDetected(stored.waterFlowDetected),
      receivedAt: new Date(stored.receivedAt),
    };

    console.log(
      `[Ultrasonic] Restored last reading for ${stored.deviceId} from ${latestReading.receivedAt.toISOString()}`
    );

    return serializeReading(latestReading);
  } catch (error) {
    console.error("[Ultrasonic] Failed to restore last reading:", error.message);
    return null;
  }
}

function serializeReading(reading) {
  const timestamp = reading.receivedAt.toISOString();

  return {
    deviceId: reading.deviceId,
    upperTank: reading.upperTank,
    lowerTank: reading.lowerTank,
    pumpStatus: reading.pumpStatus,
    pumpRunning: reading.pumpRunning,
    systemEnabled: reading.systemEnabled,
    pumpMode: reading.pumpMode,
    sensorStatus: reading.sensorStatus,
    failedSensor: reading.failedSensor,
    waterFlowDetected: reading.waterFlowDetected ?? null,
    receivedAt: timestamp,
    timestamp,
    // Backward compatibility for single-tank clients
    distanceCm: reading.upperTank.distanceCm,
    percentage: reading.upperTank.percentage,
    waterHeightCm: reading.upperTank.waterHeightCm,
    tankStatus: reading.upperTank.tankStatus,
  };
}

function withOnlineStatus(reading) {
  return {
    ...reading,
    isOnline:
      Date.now() - new Date(reading.receivedAt).getTime() < ONLINE_WINDOW_MS,
  };
}
