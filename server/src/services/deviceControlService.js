import DeviceControlState from "../models/DeviceControlState.js";
import Device from "../models/Device.js";

const DEFAULT_DEVICE_ID = "tank-01";

// Authoritative copy. The ESP32 polls the control endpoint every 2 s, so this
// read must never wait on MongoDB; the database holds a durable mirror that is
// only consulted at boot.
let deviceControlState = {
  systemEnabled: true,
  pumpMode: "AUTO", // "AUTO" | "MANUAL"
  manualPumpState: "OFF", // "ON" | "OFF"
  allowPumpOnMoteur: false, // boolean: explicit user permission to operate pump on generator
  updatedAt: new Date(),
};

function serializeState() {
  return {
    systemEnabled: deviceControlState.systemEnabled,
    pumpMode: deviceControlState.pumpMode,
    manualPumpState: deviceControlState.manualPumpState,
    allowPumpOnMoteur: Boolean(deviceControlState.allowPumpOnMoteur),
    updatedAt: deviceControlState.updatedAt.toISOString(),
  };
}

export function getDeviceControlState() {
  return serializeState();
}

export async function getDeviceControlStateAsync(deviceId = DEFAULT_DEVICE_ID) {
  const base = serializeState();
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

export function setDeviceControlState(updates = {}) {
  let changed = false;

  const nextState = {
    ...deviceControlState,
    ...updates,
  };

  // Safety rule (unchanged): disabling the system forces the manual command
  // back to OFF, so re-enabling can never resume a pump the operator stopped.
  // Also revoke any temporary Moteur override.
  if (nextState.systemEnabled === false) {
    nextState.manualPumpState = "OFF";
    nextState.allowPumpOnMoteur = false;
  }

  if (
    nextState.systemEnabled !== deviceControlState.systemEnabled ||
    nextState.pumpMode !== deviceControlState.pumpMode ||
    nextState.manualPumpState !== deviceControlState.manualPumpState ||
    nextState.allowPumpOnMoteur !== deviceControlState.allowPumpOnMoteur
  ) {
    changed = true;
    nextState.updatedAt = new Date();
    deviceControlState = nextState;
    persistState();
  }

  return {
    state: serializeState(),
    changed,
  };
}

/**
 * Mirrors the state to MongoDB without blocking the caller. A persistence
 * failure degrades restart durability only — it must never turn a successful
 * control command into an error for the dashboard or the device.
 */
function persistState() {
  DeviceControlState.findOneAndUpdate(
    { deviceId: DEFAULT_DEVICE_ID },
    {
      $set: {
        systemEnabled: deviceControlState.systemEnabled,
        pumpMode: deviceControlState.pumpMode,
        manualPumpState: deviceControlState.manualPumpState,
        allowPumpOnMoteur: deviceControlState.allowPumpOnMoteur,
        updatedAt: deviceControlState.updatedAt,
      },
    },
    { upsert: true }
  ).catch((error) => {
    console.error("[Device Control] Failed to persist state:", error.message);
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
    const stored = await DeviceControlState.findOne({
      deviceId: DEFAULT_DEVICE_ID,
    }).lean();

    if (!stored) {
      console.log("[Device Control] No stored state; using safe defaults.");
      return serializeState();
    }

    deviceControlState = {
      systemEnabled: stored.systemEnabled !== false,
      pumpMode: stored.pumpMode === "MANUAL" ? "MANUAL" : "AUTO",
      // A restart is not an instruction to run the pump. Any manual ON is
      // deliberately dropped so the hardware comes back in its safe state and
      // the operator has to re-issue the command.
      manualPumpState: "OFF",
      // Moteur permission is always reset to false on restart for safety.
      allowPumpOnMoteur: false,
      updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : new Date(),
    };

    console.log(
      `[Device Control] Restored: system ${deviceControlState.systemEnabled ? "ENABLED" : "DISABLED"}, mode ${deviceControlState.pumpMode}, manual reset to OFF, Moteur permission reset to false.`
    );

    return serializeState();
  } catch (error) {
    console.error("[Device Control] Failed to restore state:", error.message);
    return serializeState();
  }
}
