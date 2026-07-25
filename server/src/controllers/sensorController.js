import {
  getLatestReading,
  saveLatestReading,
} from "../services/ultrasonicReadingService.js";
import { emitUltrasonicReading } from "../realtime/socketServer.js";

export function receiveUltrasonicReading(req, res) {
  const reading = saveLatestReading(req.body);
  emitUltrasonicReading(reading);

  const upperStr = reading.upperTank
    ? `Upper: ${reading.upperTank.percentage.toFixed(1)}% (${reading.upperTank.distanceCm.toFixed(1)} cm)`
    : "";
  const lowerStr = reading.lowerTank
    ? `Lower: ${reading.lowerTank.percentage.toFixed(1)}% (${reading.lowerTank.distanceCm.toFixed(1)} cm)`
    : "";

  console.log(
    `[Ultrasonic] ${reading.deviceId}: ${upperStr} | ${lowerStr} | Pump: ${reading.pumpStatus} at ${reading.receivedAt}`
  );

  res.status(200).json({
    message: "Ultrasonic reading received.",
    ...reading,
  });
}

export function getLatestUltrasonicReading(req, res) {
  const reading = getLatestReading();

  if (!reading) {
    return res.status(200).json({
      message: "No ultrasonic reading has been received yet.",
      reading: null,
    });
  }

  return res.status(200).json(reading);
}
