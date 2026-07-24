import {
  getDeviceControlState,
  setDeviceControlState,
} from "../services/deviceControlService.js";
import { emitDeviceControlChanged } from "../realtime/socketServer.js";

export function getDeviceControl(req, res) {
  const control = getDeviceControlState();
  res.status(200).json({
    success: true,
    control,
    ...control,
  });
}

export function updateDeviceControl(req, res) {
  console.log("PUT /api/device/control");
  console.log("Request body:", req.body);

  const { state, changed } = setDeviceControlState(req.body);

  if (changed) {
    emitDeviceControlChanged(state);
    console.log(
      `[Device Control] System ${state.systemEnabled ? "ENABLED" : "DISABLED"} | Mode: ${state.pumpMode} | Manual: ${state.manualPumpState}`
    );
  }

  res.status(200).json({
    success: true,
    control: state,
    ...state,
  });
}
