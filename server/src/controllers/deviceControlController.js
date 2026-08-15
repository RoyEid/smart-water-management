import {
  getDeviceControlState,
  getDeviceControlStateAsync,
  setDeviceControlState,
} from "../services/deviceControlService.js";
import { emitDeviceControlChanged } from "../realtime/socketServer.js";
import { recordAudit } from "../services/auditService.js";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";

export async function getDeviceControl(req, res, next) {
  try {
    const deviceId = req.query?.deviceId || req.body?.deviceId || "tank-01";
    const control = await getDeviceControlStateAsync(deviceId);
    res.status(200).json({
      success: true,
      control,
      ...control,
    });
  } catch (error) {
    next(error);
  }
}

export function updateDeviceControl(req, res) {
  const previous = getDeviceControlState();
  const { state, changed } = setDeviceControlState(req.body);

  if (changed) {
    emitDeviceControlChanged(state);
    console.log(
      `[Device Control] System ${state.systemEnabled ? "ENABLED" : "DISABLED"} | Mode: ${state.pumpMode} | Manual: ${state.manualPumpState} | Moteur Pump Permission: ${state.allowPumpOnMoteur ? "ALLOWED" : "BLOCKED"}`
    );
    // Only user-initiated changes are audited. The ESP32 authenticates with the
    // device key and only ever reads this endpoint, so a device request never
    // produces an entry attributed to a person.
    if (req.user) {
      auditControlChange(req, previous, state);
    }
  }

  res.status(200).json({
    success: true,
    control: state,
    ...state,
  });
}

/**
 * One audit row per field that actually changed, so "switched to MANUAL and
 * turned the pump on" reads as two distinct, individually filterable actions
 * rather than one opaque "control updated".
 */
function auditControlChange(req, previous, next) {
  if (previous.systemEnabled !== next.systemEnabled) {
    recordAudit({
      req,
      action: next.systemEnabled
        ? AUDIT_ACTIONS.SYSTEM_ENABLED
        : AUDIT_ACTIONS.SYSTEM_DISABLED,
      targetType: "device",
      targetId: "tank-01",
      metadata: { systemEnabled: next.systemEnabled },
    });
  }

  if (previous.pumpMode !== next.pumpMode) {
    recordAudit({
      req,
      action: AUDIT_ACTIONS.PUMP_MODE_CHANGED,
      targetType: "device",
      targetId: "tank-01",
      metadata: { from: previous.pumpMode, to: next.pumpMode },
    });
  }

  if (previous.manualPumpState !== next.manualPumpState) {
    recordAudit({
      req,
      action: AUDIT_ACTIONS.MANUAL_PUMP_COMMAND,
      targetType: "device",
      targetId: "tank-01",
      metadata: { command: next.manualPumpState, mode: next.pumpMode },
    });
  }

  if (previous.allowPumpOnMoteur !== next.allowPumpOnMoteur) {
    recordAudit({
      req,
      action: next.allowPumpOnMoteur
        ? AUDIT_ACTIONS.MOTEUR_PUMP_PERMISSION_ENABLED
        : AUDIT_ACTIONS.MOTEUR_PUMP_PERMISSION_DISABLED,
      targetType: "device",
      targetId: "tank-01",
      metadata: { allowPumpOnMoteur: next.allowPumpOnMoteur },
    });
  }
}
