import UltrasonicReading from "../models/UltrasonicReading.js";
import Device from "../models/Device.js";
import { touchDevice } from "./deviceService.js";
import { syncAlerts } from "./alertService.js";
import {
  getDeviceControlState,
  setDeviceControlState,
} from "./deviceControlService.js";
import { emitDeviceControlChanged } from "../realtime/socketServer.js";

const ONLINE_WINDOW_MS = 20_000;

// Kept in memory by deviceId so the dashboard and the ESP32 response path never wait on
// (or fail because of) MongoDB. Mongo is the durable copy, this is the hot one.
const latestReadingsByDevice = new Map();

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
    // Electricity source telemetry (DAWLE / MOTEUR)
    powerSource,
    allowPumpOnMoteur,
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
    powerSource: normalizePowerSource(powerSource),
    allowPumpOnMoteur: Boolean(allowPumpOnMoteur),
    receivedAt,
  };
}

/**
 * Normalizes electricity source: DAWLE or MOTEUR.
 * Safest failure behavior: missing or unknown source defaults to MOTEUR.
 */
export function normalizePowerSource(source) {
  if (typeof source === "string" && source.trim().toUpperCase() === "DAWLE") {
    return "DAWLE";
  }
  return "MOTEUR";
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
  const reading = normalizePayload(payload);
  const deviceId = reading.deviceId;
  const previousPowerSource = latestReadingsByDevice.get(deviceId)?.powerSource ?? null;
  latestReadingsByDevice.set(deviceId, reading);

  // Transition safety: when DAWLE -> MOTEUR transition occurs, reset any Moteur permission
  if (previousPowerSource === "DAWLE" && reading.powerSource === "MOTEUR") {
    const currentControl = getDeviceControlState(deviceId);
    if (currentControl.allowPumpOnMoteur) {
      const { state } = setDeviceControlState(deviceId, { allowPumpOnMoteur: false });
      emitDeviceControlChanged(state);
    }
  }

  // Persist without blocking the device response. A MongoDB problem must
  // degrade durability only — it must never turn a good reading into an error
  // for the ESP32 or stall the live dashboard update.
  UltrasonicReading.create(reading).catch((error) => {
    console.error("[Ultrasonic] Failed to persist reading:", error.message);
  });

  const serialized = serializeReading(reading);

  // Registry and alerting are downstream consumers of the reading, held to the
  // same rule: both swallow their own failures so neither can turn a valid
  // device POST into an error. A reading that arrived is always accepted.
  touchDevice(serialized);
  syncAlerts(serialized, { isOnline: true });

  return serialized;
}

export function getLatestReading(deviceId = null) {
  if (deviceId) {
    const reading = latestReadingsByDevice.get(deviceId);
    return reading ? withOnlineStatus(serializeReading(reading)) : null;
  }

  // If no specific device requested, find the newest reading across all devices (for global overview)
  let newest = null;
  for (const r of latestReadingsByDevice.values()) {
    if (!newest || r.receivedAt > newest.receivedAt) {
      newest = r;
    }
  }

  return newest ? withOnlineStatus(serializeReading(newest)) : null;
}

/**
 * Restores the last stored reading after a backend restart so the dashboard
 * shows real history instead of "Awaiting Data". The online/offline decision
 * still comes from the reading's own timestamp, so a stale restored reading
 * correctly reports the device as offline.
 */
export async function hydrateLatestReading() {
  try {
    const deviceIds = await Device.find({}).distinct("deviceId");
    const targets = deviceIds.length > 0 ? deviceIds : ["tank-01"];

    for (const devId of targets) {
      const stored = await UltrasonicReading.findOne({ deviceId: devId })
        .sort({ receivedAt: -1 })
        .lean();

      if (stored) {
        const restored = {
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
          powerSource: normalizePowerSource(stored.powerSource),
          allowPumpOnMoteur: false,
          receivedAt: new Date(stored.receivedAt),
        };
        latestReadingsByDevice.set(devId, restored);
        console.log(
          `[Ultrasonic] Restored last reading for ${devId} from ${restored.receivedAt.toISOString()}`
        );
      }
    }

    return getLatestReading();
  } catch (error) {
    console.error("[Ultrasonic] Failed to restore last readings:", error.message);
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
    powerSource: reading.powerSource ?? "MOTEUR",
    allowPumpOnMoteur: Boolean(reading.allowPumpOnMoteur),
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
