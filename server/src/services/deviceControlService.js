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

  // Safety rule: if system is disabled, force manualPumpState to OFF
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
  }

  return {
    state: serializeState(),
    changed,
  };
}
