import DeviceControlState from "../models/DeviceControlState.js";

const DEFAULT_DEVICE_ID = "tank-01";

// Authoritative copy. The ESP32 polls the control endpoint every 2 s, so this
// read must never wait on MongoDB; the database holds a durable mirror that is
// only consulted at boot.
let deviceControlState = {
  systemEnabled: true,
  pumpMode: "AUTO", // "AUTO" | "MANUAL"
  manualPumpState: "OFF", // "ON" | "OFF"
  updatedAt: new Date(),
};

function serializeState() {
  return {
    systemEnabled: deviceControlState.systemEnabled,
    pumpMode: deviceControlState.pumpMode,
    manualPumpState: deviceControlState.manualPumpState,
    updatedAt: deviceControlState.updatedAt.toISOString(),
  };
}

export function getDeviceControlState() {
  return serializeState();
}

export function setDeviceControlState(updates = {}) {
  let changed = false;

  const nextState = {
    ...deviceControlState,
    ...updates,
  };

  // Safety rule (unchanged): disabling the system forces the manual command
  // back to OFF, so re-enabling can never resume a pump the operator stopped.
  if (nextState.systemEnabled === false) {
    nextState.manualPumpState = "OFF";
  }

  if (
    nextState.systemEnabled !== deviceControlState.systemEnabled ||
    nextState.pumpMode !== deviceControlState.pumpMode ||
    nextState.manualPumpState !== deviceControlState.manualPumpState
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
      updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : new Date(),
    };

    console.log(
      `[Device Control] Restored: system ${deviceControlState.systemEnabled ? "ENABLED" : "DISABLED"}, mode ${deviceControlState.pumpMode}, manual reset to OFF.`
    );

    return serializeState();
  } catch (error) {
    console.error("[Device Control] Failed to restore state:", error.message);
    return serializeState();
  }
}
