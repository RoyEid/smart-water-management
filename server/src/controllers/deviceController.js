import Device from "../models/Device.js";
import UltrasonicReading from "../models/UltrasonicReading.js";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";
import { recordAudit } from "../services/auditService.js";
import { getLatestReading } from "../services/ultrasonicReadingService.js";
import { getDeviceControlState } from "../services/deviceControlService.js";
import { isDeviceOnline } from "../services/deviceService.js";

import {
  getUserAccessibleDevices,
  getDevicePermission,
} from "../services/deviceAccessService.js";

/**
 * The device list is assembled from the registry plus the live telemetry
 * service, so a device that has never reported still appears (offline, no
 * readings) rather than being invisible until its first POST.
 */
function serializeTankConfig(tanks) {
  if (!tanks) return null;
  const upper = tanks.upper || {};
  const lower = tanks.lower || {};
  const upperCap = upper.capacityLiters ?? null;
  const upperHeightCm = upper.heightCm ?? null;
  const lowerCap = lower.capacityLiters ?? null;
  const lowerHeightCm = lower.heightCm ?? null;

  const isConfigured = Boolean(
    upperCap !== null && upperHeightCm !== null && lowerCap !== null && lowerHeightCm !== null
  );

  return {
    upper: {
      capacityLiters: upperCap,
      heightCm: upperHeightCm,
      heightMeters: upperHeightCm !== null ? Number((upperHeightCm / 100).toFixed(2)) : null,
    },
    lower: {
      capacityLiters: lowerCap,
      heightCm: lowerHeightCm,
      heightMeters: lowerHeightCm !== null ? Number((lowerHeightCm / 100).toFixed(2)) : null,
    },
    configuredAt: tanks.configuredAt ?? null,
    isConfigured,
  };
}

export function serializeDevice(device, latestReading, control, userRole = null) {
  const online = isDeviceOnline(device.lastSeenAt);
  const isLatestDevice = latestReading?.deviceId === device.deviceId;
  const reading = isLatestDevice ? latestReading : null;

  return {
    deviceId: device.deviceId,
    displayName: device.displayName || device.deviceId,
    hasCustomName: Boolean(device.displayName),
    owner: device.owner ?? null,
    ownerAssignedAt: device.ownerAssignedAt ?? null,
    userRole: userRole || device.userRole || (device.owner ? "user" : null),
    nickname: device.nickname || "",
    tanks: serializeTankConfig(device.tanks),
    isOnline: online,
    lastSeenAt: device.lastSeenAt ?? null,
    firstSeenAt: device.firstSeenAt ?? null,
    firmwareVersion: device.firmwareVersion ?? null,
    totalReadings: device.totalReadings ?? 0,
    upperTank: reading?.upperTank ?? null,
    lowerTank: reading?.lowerTank ?? null,
    upperSensorStatus: reading?.upperTank?.tankStatus ?? null,
    lowerSensorStatus: reading?.lowerTank?.tankStatus ?? null,
    pumpStatus: reading?.pumpStatus ?? null,
    pumpMode: isLatestDevice ? control.pumpMode : null,
    systemEnabled: isLatestDevice ? control.systemEnabled : null,
    allowPumpOnMoteur: isLatestDevice ? control.allowPumpOnMoteur : null,
    powerSource: reading?.powerSource ?? null,
    latestTelemetryAt: reading?.receivedAt ?? null,
    waterFlowDetected: reading?.waterFlowDetected ?? null,
  };
}

export async function listDevices(req, res, next) {
  try {
    const accessibleDevices = await getUserAccessibleDevices(req.user);

    res.status(200).json({
      success: true,
      devices: accessibleDevices.map((device) =>
        serializeDevice(
          device,
          getLatestReading(device.deviceId),
          getDeviceControlState(device.deviceId),
          device.userRole
        )
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDevice(req, res, next) {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId })
      .populate("owner", "name email avatar")
      .lean();

    if (!device) {
      const error = new Error("Device not found.");
      error.statusCode = 404;
      return next(error);
    }

    let userRole = "admin";
    if (req.user?.role === "user") {
      const permission = await getDevicePermission(req.user._id, device.deviceId);
      if (!permission) {
        const error = new Error("You are not authorized to view this device.");
        error.statusCode = 403;
        return next(error);
      }
      userRole = permission;
    }

    const latestReading = getLatestReading(device.deviceId);
    const control = getDeviceControlState(device.deviceId);

    const lastStored = await UltrasonicReading.findOne({
      deviceId: device.deviceId,
    })
      .sort({ receivedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      device: serializeDevice(device, latestReading, control, userRole),
      lastStoredReading: lastStored ? serializeStoredReading(lastStored) : null,
    });
  } catch (error) {
    next(error);
  }
}

export function serializeStoredReading(reading) {
  return {
    id: String(reading._id),
    deviceId: reading.deviceId,
    upperTank: reading.upperTank ?? null,
    lowerTank: reading.lowerTank ?? null,
    pumpStatus: reading.pumpStatus ?? null,
    pumpRunning: reading.pumpRunning ?? null,
    pumpMode: reading.pumpMode ?? null,
    systemEnabled: reading.systemEnabled ?? null,
    sensorStatus: reading.sensorStatus ?? null,
    failedSensor: reading.failedSensor ?? null,
    waterFlowDetected: reading.waterFlowDetected ?? null,
    powerSource: reading.powerSource ?? "MOTEUR",
    allowPumpOnMoteur: Boolean(reading.allowPumpOnMoteur),
    receivedAt: reading.receivedAt,
  };
}

export async function renameDevice(req, res, next) {
  try {
    const { displayName } = req.body;
    const device = await Device.findOne({ deviceId: req.params.deviceId });

    if (!device) {
      const error = new Error("Device not found.");
      error.statusCode = 404;
      return next(error);
    }

    const previousName = device.displayName || device.deviceId;
    device.displayName = displayName;
    await device.save();

    await recordAudit({
      req,
      action: AUDIT_ACTIONS.DEVICE_RENAMED,
      targetType: "device",
      targetId: device.deviceId,
      targetLabel: device.deviceId,
      metadata: { from: previousName, to: displayName || device.deviceId },
    });

    res.status(200).json({
      success: true,
      message: "Device name updated.",
      device: serializeDevice(
        device.toObject(),
        getLatestReading(device.deviceId),
        getDeviceControlState(device.deviceId)
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTankConfig(req, res, next) {
  try {
    // STRICT RULE: Admins cannot modify tank parameters!
    if (req.user?.role === "admin") {
      const error = new Error("Administrators are not permitted to modify device tank parameters.");
      error.statusCode = 403;
      return next(error);
    }

    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      const error = new Error("Device not found.");
      error.statusCode = 404;
      return next(error);
    }

    // STRICT RULE: Only the device Owner can modify tank configuration (Controllers & Viewers cannot)
    const permission = await getDevicePermission(req.user._id, device.deviceId);
    if (permission !== "owner") {
      const error = new Error("Only the device owner is authorized to configure tank parameters.");
      error.statusCode = 403;
      return next(error);
    }

    const previousTanks = serializeTankConfig(device.tanks);

    const { upper, lower } = req.body;

    const validateTank = (tank, name) => {
      if (!tank || typeof tank !== "object") {
        throw new Error(`${name} tank parameters are required.`);
      }
      const capacityLiters = Number(tank.capacityLiters);
      const heightMeters = Number(tank.heightMeters);

      if (!Number.isFinite(capacityLiters) || capacityLiters <= 0) {
        throw new Error(`${name} tank capacity must be a positive number in Liters.`);
      }
      if (!Number.isFinite(heightMeters) || heightMeters <= 0) {
        throw new Error(`${name} tank usable height must be a positive number in Meters.`);
      }
      if (capacityLiters > 1_000_000) {
        throw new Error(`${name} tank capacity cannot exceed 1,000,000 Liters.`);
      }
      if (heightMeters > 50) {
        throw new Error(`${name} tank usable height cannot exceed 50 Meters.`);
      }

      return {
        capacityLiters,
        heightCm: Math.round(heightMeters * 100),
      };
    };

    let upperConfig, lowerConfig;
    try {
      upperConfig = validateTank(upper, "Upper");
      lowerConfig = validateTank(lower, "Lower");
    } catch (valErr) {
      valErr.statusCode = 400;
      return next(valErr);
    }

    device.tanks = {
      upper: upperConfig,
      lower: lowerConfig,
      configuredAt: new Date(),
      configuredBy: req.user._id,
    };

    await device.save();

    const nextTanks = serializeTankConfig(device.tanks);

    await recordAudit({
      req,
      action: AUDIT_ACTIONS.TANK_CONFIG_UPDATED,
      targetType: "device",
      targetId: device.deviceId,
      targetLabel: device.displayName || device.deviceId,
      metadata: {
        previous: previousTanks,
        next: nextTanks,
      },
    });

    res.status(200).json({
      success: true,
      message: "Tank configuration saved. It will sync when the device reconnects.",
      device: serializeDevice(
        device.toObject(),
        getLatestReading(device.deviceId),
        getDeviceControlState(device.deviceId)
      ),
    });
  } catch (error) {
    next(error);
  }
}
