import DeviceControlState from "../models/DeviceControlState.js";
import Device from "../models/Device.js";

// Authoritative copies by deviceId. The ESP32 polls the control endpoint every 2 s, so this
// read must never wait on MongoDB; the database holds a durable mirror that is
// only consulted at boot.
const deviceControlStatesByDevice = new Map();

function defaultState(deviceId = "tank-01") {
  return {
    deviceId,
    systemEnabled: true,
    pumpMode: "AUTO", // "AUTO" | "MANUAL"
    manualPumpState: "OFF", // "ON" | "OFF"
    allowPumpOnMoteur: false, // boolean: explicit user permission to operate pump on generator
    updatedAt: new Date(),
  };
}

function serializeState(state) {
  return {
    deviceId: state.deviceId,
    systemEnabled: state.systemEnabled,
    pumpMode: state.pumpMode,
    manualPumpState: state.manualPumpState,
    allowPumpOnMoteur: Boolean(state.allowPumpOnMoteur),
    updatedAt: state.updatedAt instanceof Date ? state.updatedAt.toISOString() : new Date(state.updatedAt).toISOString(),
  };
}

function getInternalState(deviceId = "tank-01") {
  const key = deviceId || "tank-01";
  if (!deviceControlStatesByDevice.has(key)) {
    deviceControlStatesByDevice.set(key, defaultState(key));
  }
  return deviceControlStatesByDevice.get(key);
}

export function getDeviceControlState(deviceId = "tank-01") {
  return serializeState(getInternalState(deviceId));
}

export async function getDeviceControlStateAsync(deviceId = "tank-01") {
  const base = serializeState(getInternalState(deviceId));
  try {
    const device = await Device.findOne({ deviceId }).lean();
    return {
      ...base,
      upperTankHeightCm: device?.tanks?.upper?.heightCm ?? null,
      lowerTankHeightCm: device?.tanks?.lower?.heightCm ?? null,
      upperCapacityLiters: device?.tanks?.upper?.capacityLiters ?? null,
      lowerCapacityLiters: device?.tanks?.lower?.capacityLiters ?? null,
    };
  } catch {
    return {
      ...base,
      upperTankHeightCm: null,
      lowerTankHeightCm: null,
      upperCapacityLiters: null,
      lowerCapacityLiters: null,
    };
  }
}

export function setDeviceControlState(deviceIdOrUpdates = {}, maybeUpdates = null) {
  let deviceId = "tank-01";
  let updates = {};

  if (typeof deviceIdOrUpdates === "string") {
    deviceId = deviceIdOrUpdates || "tank-01";
    updates = maybeUpdates || {};
  } else if (deviceIdOrUpdates && typeof deviceIdOrUpdates === "object") {
    updates = deviceIdOrUpdates;
    deviceId = updates.deviceId || "tank-01";
  }

  const currentState = getInternalState(deviceId);
  let changed = false;

  const nextState = {
    ...currentState,
    ...updates,
    deviceId,
  };

  // Safety rule (unchanged): disabling the system forces the manual command
  // back to OFF, so re-enabling can never resume a pump the operator stopped.
  // Also revoke any temporary Moteur override.
  if (nextState.systemEnabled === false) {
    nextState.manualPumpState = "OFF";
    nextState.allowPumpOnMoteur = false;
  }

  if (
    nextState.systemEnabled !== currentState.systemEnabled ||
    nextState.pumpMode !== currentState.pumpMode ||
    nextState.manualPumpState !== currentState.manualPumpState ||
    nextState.allowPumpOnMoteur !== currentState.allowPumpOnMoteur
  ) {
    changed = true;
    nextState.updatedAt = new Date();
    deviceControlStatesByDevice.set(deviceId, nextState);
    persistState(deviceId);
  }

  return {
    state: serializeState(getInternalState(deviceId)),
    changed,
  };
}

/**
 * Mirrors the state to MongoDB without blocking the caller. A persistence
 * failure degrades restart durability only — it must never turn a successful
 * control command into an error for the dashboard or the device.
 */
function persistState(deviceId = "tank-01") {
  const state = getInternalState(deviceId);
  DeviceControlState.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        systemEnabled: state.systemEnabled,
        pumpMode: state.pumpMode,
        manualPumpState: state.manualPumpState,
        allowPumpOnMoteur: state.allowPumpOnMoteur,
        updatedAt: state.updatedAt,
      },
    },
    { upsert: true }
  ).catch((error) => {
    console.error(`[Device Control] Failed to persist state for ${deviceId}:`, error.message);
  });
}

/**
 * Restores the last control state after a restart.
 *
 * Previously the backend always came back up as enabled/AUTO, so a system an
 * operator had deliberately disabled could silently re-arm itself. The safety
 * rules are unchanged — only the starting values are now remembered.
 */
export async function hydrateDeviceControlState() {
  try {
    const storedList = await DeviceControlState.find({}).lean();

    if (!storedList || storedList.length === 0) {
      console.log("[Device Control] No stored state; using safe defaults.");
      return serializeState(getInternalState("tank-01"));
    }

    for (const stored of storedList) {
      const devId = stored.deviceId || "tank-01";
      deviceControlStatesByDevice.set(devId, {
        deviceId: devId,
        systemEnabled: stored.systemEnabled !== false,
        pumpMode: stored.pumpMode === "MANUAL" ? "MANUAL" : "AUTO",
        manualPumpState: "OFF",
        allowPumpOnMoteur: false,
        updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : new Date(),
      });
      console.log(
        `[Device Control] Restored ${devId}: system ${stored.systemEnabled !== false ? "ENABLED" : "DISABLED"}, mode ${stored.pumpMode || "AUTO"}, manual reset to OFF, Moteur permission reset to false.`
      );
    }

    return serializeState(getInternalState("tank-01"));
  } catch (error) {
    console.error("[Device Control] Failed to restore state:", error.message);
    return serializeState(getInternalState("tank-01"));
  }
}
