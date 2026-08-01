import Device from "../models/Device.js";
import UltrasonicReading from "../models/UltrasonicReading.js";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";
import { recordAudit } from "../services/auditService.js";
import { getLatestReading } from "../services/ultrasonicReadingService.js";
import { getDeviceControlState } from "../services/deviceControlService.js";
import { isDeviceOnline } from "../services/deviceService.js";

/**
 * The device list is assembled from the registry plus the live telemetry
 * service, so a device that has never reported still appears (offline, no
 * readings) rather than being invisible until its first POST.
 */
function serializeDevice(device, latestReading, control) {
  const online = isDeviceOnline(device.lastSeenAt);
  // The hot telemetry copy only holds the most recent device. For any other
  // device the live fields are genuinely unknown, and are reported as null
  // rather than borrowed from a different device's reading.
  const isLatestDevice = latestReading?.deviceId === device.deviceId;
  const reading = isLatestDevice ? latestReading : null;

  return {
    deviceId: device.deviceId,
    displayName: device.displayName || device.deviceId,
    hasCustomName: Boolean(device.displayName),
    isOnline: online,
    lastSeenAt: device.lastSeenAt ?? null,
    firstSeenAt: device.firstSeenAt ?? null,
    // The current ultrasonic firmware does not report a version. Null here is
    // the honest answer and the UI renders "Not reported".
    firmwareVersion: device.firmwareVersion ?? null,
    totalReadings: device.totalReadings ?? 0,
    upperTank: reading?.upperTank ?? null,
    lowerTank: reading?.lowerTank ?? null,
    upperSensorStatus: reading?.upperTank?.tankStatus ?? null,
    lowerSensorStatus: reading?.lowerTank?.tankStatus ?? null,
    pumpStatus: reading?.pumpStatus ?? null,
    pumpMode: isLatestDevice ? control.pumpMode : null,
    systemEnabled: isLatestDevice ? control.systemEnabled : null,
    latestTelemetryAt: reading?.receivedAt ?? null,
    flowRateLMin: reading?.flowRateLMin ?? null,
    totalTransferredLitres: reading?.totalTransferredLitres ?? null,
  };
}

export async function listDevices(req, res, next) {
  try {
    const devices = await Device.find({}).sort({ deviceId: 1 }).lean();
    const latestReading = getLatestReading();
    const control = getDeviceControlState();

    res.status(200).json({
      success: true,
      devices: devices.map((device) =>
        serializeDevice(device, latestReading, control)
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDevice(req, res, next) {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId }).lean();

    if (!device) {
      const error = new Error("Device not found.");
      error.statusCode = 404;
      return next(error);
    }

    const latestReading = getLatestReading();
    const control = getDeviceControlState();

    // The most recent stored reading for *this* device, which is not always the
    // in-memory one when more than one device reports.
    const lastStored = await UltrasonicReading.findOne({
      deviceId: device.deviceId,
    })
      .sort({ receivedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      device: serializeDevice(device, latestReading, control),
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
    // Flow fields stay null when the firmware did not report them. They are
    // never substituted with 0, which would read as "measured no flow".
    flowRateLMin: reading.flowRateLMin ?? null,
    totalTransferredLitres: reading.totalTransferredLitres ?? null,
    flowDataMode: reading.flowDataMode ?? null,
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
      device: serializeDevice(device.toObject(), getLatestReading(), getDeviceControlState()),
    });
  } catch (error) {
    next(error);
  }
}
