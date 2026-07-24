import {
  getLatestReading,
  saveLatestReading,
} from "../services/ultrasonicReadingService.js";
import { emitUltrasonicReading } from "../realtime/socketServer.js";

export function receiveUltrasonicReading(req, res) {
  const reading = saveLatestReading(req.body);
  emitUltrasonicReading(reading);

  console.log(
    `[Ultrasonic] ${reading.deviceId}: ${reading.percentage.toFixed(1)}% (${reading.distanceCm.toFixed(1)} cm) | Tank: ${reading.tankStatus} | Pump: ${reading.pumpStatus} at ${reading.receivedAt}`
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
