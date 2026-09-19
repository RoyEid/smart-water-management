import {
  getDeviceControlState,
  getDeviceControlStateAsync,
  setDeviceControlState,
} from "../services/deviceControlService.js";
import {
  getAccessibleDeviceIds,
  getDevicePermission,
} from "../services/deviceAccessService.js";
import { emitDeviceControlChanged } from "../realtime/socketServer.js";
import { recordAudit } from "../services/auditService.js";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";

export async function getDeviceControl(req, res, next) {
  try {
    const isDeviceAuth = Boolean(req.get("x-device-key"));
    if (isDeviceAuth || req.device?.deviceId) {
      const deviceId = req.device?.deviceId || req.query?.deviceId || "tank-01";
      const control = await getDeviceControlStateAsync(deviceId);
      return res.status(200).json({
        success: true,
        control,
        ...control,
      });
    }

    const accessibleDeviceIds = await getAccessibleDeviceIds(req.user);

    if (accessibleDeviceIds.length === 0) {
      return res.status(200).json({
        success: true,
        control: null,
        message: "No device assigned.",
      });
    }

    let targetDeviceId = req.query?.deviceId || req.body?.deviceId;
    if (targetDeviceId) {
      if (!accessibleDeviceIds.includes(targetDeviceId)) {
        const error = new Error("You are not authorized to view controls for this device.");
        error.statusCode = 403;
        return next(error);
      }
    } else {
      targetDeviceId = accessibleDeviceIds[0];
    }

    const control = await getDeviceControlStateAsync(targetDeviceId);
    return res.status(200).json({
      success: true,
      control,
      ...control,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDeviceControl(req, res, next) {
  try {
    let targetDeviceId = req.device?.deviceId || req.body?.deviceId || req.query?.deviceId;

    if (req.user) {
      const accessibleDeviceIds = await getAccessibleDeviceIds(req.user);

      if (accessibleDeviceIds.length === 0) {
        const error = new Error("You have no assigned device to operate.");
        error.statusCode = 403;
        return next(error);
      }

      if (!targetDeviceId) {
        targetDeviceId = accessibleDeviceIds[0];
      }

      // Check per-device role: Viewers must be rejected!
      const permission = await getDevicePermission(req.user._id, targetDeviceId);

      if (!permission) {
        const error = new Error("You are not authorized to operate controls for this device.");
        error.statusCode = 403;
        return next(error);
      }

      if (permission === "viewer") {
        const error = new Error("Viewers have read-only access and cannot operate device controls.");
        error.statusCode = 403;
        return next(error);
      }
    }

    if (!targetDeviceId) {
      targetDeviceId = "tank-01";
    }

    const previous = getDeviceControlState(targetDeviceId);
    const { state, changed } = setDeviceControlState(targetDeviceId, req.body);

    if (changed) {
      emitDeviceControlChanged(state);
      console.log(
        `[Device Control] ${targetDeviceId}: System ${state.systemEnabled ? "ENABLED" : "DISABLED"} | Mode: ${state.pumpMode} | Manual: ${state.manualPumpState} | Moteur Pump Permission: ${state.allowPumpOnMoteur ? "ALLOWED" : "BLOCKED"}`
      );
      // Only user-initiated changes are audited. The ESP32 authenticates with the
      // device key and only ever reads this endpoint, so a device request never
      // produces an entry attributed to a person.
      if (req.user) {
        auditControlChange(req, previous, state, targetDeviceId);
      }
    }

    res.status(200).json({
      success: true,
      control: state,
      ...state,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * One audit row per field that actually changed, so "switched to MANUAL and
 * turned the pump on" reads as two distinct, individually filterable actions
 * rather than one opaque "control updated".
 */
function auditControlChange(req, previous, next, targetDeviceId = "tank-01") {
  if (previous.systemEnabled !== next.systemEnabled) {
    recordAudit({
      req,
      action: next.systemEnabled
        ? AUDIT_ACTIONS.SYSTEM_ENABLED
        : AUDIT_ACTIONS.SYSTEM_DISABLED,
      targetType: "device",
      targetId: targetDeviceId,
      targetLabel: targetDeviceId,
      metadata: { systemEnabled: next.systemEnabled },
    });
  }

  if (previous.pumpMode !== next.pumpMode) {
    recordAudit({
      req,
      action: AUDIT_ACTIONS.PUMP_MODE_CHANGED,
      targetType: "device",
      targetId: targetDeviceId,
      targetLabel: targetDeviceId,
      metadata: { from: previous.pumpMode, to: next.pumpMode },
    });
  }

  if (previous.manualPumpState !== next.manualPumpState) {
    recordAudit({
      req,
      action: AUDIT_ACTIONS.MANUAL_PUMP_COMMAND,
      targetType: "device",
      targetId: targetDeviceId,
      targetLabel: targetDeviceId,
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
      targetId: targetDeviceId,
      targetLabel: targetDeviceId,
      metadata: { allowPumpOnMoteur: next.allowPumpOnMoteur },
    });
  }
}
