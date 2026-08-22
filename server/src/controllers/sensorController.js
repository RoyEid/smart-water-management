import Device from "../models/Device.js";
import UltrasonicReading from "../models/UltrasonicReading.js";
import {
  getLatestReading,
  saveLatestReading,
} from "../services/ultrasonicReadingService.js";
import { getAccessibleDeviceIds } from "../services/deviceAccessService.js";
import { emitUltrasonicReading } from "../realtime/socketServer.js";
import { serializeStoredReading } from "./deviceController.js";

export function receiveUltrasonicReading(req, res) {
  const reading = saveLatestReading(req.body);
  emitUltrasonicReading(reading);

  const upperStr = `Upper: ${reading.upperTank.percentage.toFixed(1)}% (${reading.upperTank.distanceCm.toFixed(1)} cm)`;
  const lowerStr = `Lower: ${reading.lowerTank.percentage.toFixed(1)}% (${reading.lowerTank.distanceCm.toFixed(1)} cm)`;

  console.log(
    `[Ultrasonic] ${reading.deviceId}: ${upperStr} | ${lowerStr} | Pump: ${reading.pumpStatus} at ${reading.receivedAt}`
  );

  res.status(200).json({
    success: true,
    message: "Ultrasonic reading received.",
    ...reading,
  });
}

export async function getLatestUltrasonicReading(req, res, next) {
  try {
    // 1. Normal User Role Scoping
    if (req.user?.role === "user") {
      const accessibleDeviceIds = await getAccessibleDeviceIds(req.user);

      if (accessibleDeviceIds.length === 0) {
        return res.status(200).json(null);
      }

      let targetDeviceId = req.query?.deviceId;
      if (targetDeviceId) {
        if (!accessibleDeviceIds.includes(targetDeviceId)) {
          const error = new Error("You are not authorized to view telemetry for this device.");
          error.statusCode = 403;
          return next(error);
        }
      } else {
        targetDeviceId = accessibleDeviceIds[0];
      }

      const memoryReading = getLatestReading(targetDeviceId);
      if (memoryReading) {
        return res.status(200).json(memoryReading);
      }

      const lastStored = await UltrasonicReading.findOne({ deviceId: targetDeviceId })
        .sort({ receivedAt: -1 })
        .lean();

      if (lastStored) {
        return res.status(200).json(serializeStoredReading(lastStored));
      }

      return res.status(200).json(null);
    }

    // 2. Admin Role Scoping
    if (req.query?.deviceId) {
      const targetDeviceId = req.query.deviceId;
      const memoryReading = getLatestReading(targetDeviceId);
      if (memoryReading) {
        return res.status(200).json(memoryReading);
      }
      const lastStored = await UltrasonicReading.findOne({ deviceId: targetDeviceId })
        .sort({ receivedAt: -1 })
        .lean();
      if (lastStored) {
        return res.status(200).json(serializeStoredReading(lastStored));
      }
      return res.status(200).json(null);
    }

    const memoryReading = getLatestReading();
    return res.status(200).json(memoryReading || null);
  } catch (error) {
    next(error);
  }
}
