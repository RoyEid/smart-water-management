import UltrasonicReading from "../models/UltrasonicReading.js";

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
    // Optional YF-S201 flow telemetry — absent in the current firmware.
    flowRateLMin,
    sessionVolumeLiters,
    flowStatus,
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
    flowRateLMin: flowRateLMin ?? null,
    sessionVolumeLiters: sessionVolumeLiters ?? null,
    flowStatus: flowStatus ?? null,
    receivedAt,
  };
}

export function saveLatestReading(payload) {
  latestReading = normalizePayload(payload);

  // Persist without blocking the device response. A MongoDB problem must
  // degrade durability only — it must never turn a good reading into an error
  // for the ESP32 or stall the live dashboard update.
  UltrasonicReading.create(latestReading).catch((error) => {
    console.error("[Ultrasonic] Failed to persist reading:", error.message);
  });

  return serializeReading(latestReading);
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
      flowRateLMin: stored.flowRateLMin ?? null,
      sessionVolumeLiters: stored.sessionVolumeLiters ?? null,
      flowStatus: stored.flowStatus ?? null,
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
    flowRateLMin: reading.flowRateLMin,
    sessionVolumeLiters: reading.sessionVolumeLiters,
    flowStatus: reading.flowStatus,
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
