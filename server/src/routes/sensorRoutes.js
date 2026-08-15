import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  getLatestUltrasonicReading,
  receiveUltrasonicReading,
} from "../controllers/sensorController.js";
import authenticate from "../middleware/authenticate.js";
import authenticateDevice from "../middleware/authenticateDevice.js";
import validateRequest from "../middleware/validateRequest.js";

const router = Router();

export const tankDataSchema = z.object({
  distanceCm: z
    .number({ invalid_type_error: "distanceCm must be a number." })
    .finite("distanceCm must be a finite number.")
    .min(0, "distanceCm cannot be negative.")
    .max(400, "distanceCm must be at most 400 cm."),
  percentage: z
    .number({ invalid_type_error: "percentage must be a number." })
    .finite("percentage must be a finite number.")
    .min(0, "percentage must be between 0 and 100.")
    .max(100, "percentage must be between 0 and 100."),
  waterHeightCm: z
    .number({ invalid_type_error: "waterHeightCm must be a number." })
    .finite("waterHeightCm must be a finite number.")
    .min(0, "waterHeightCm cannot be negative.")
    .max(5000, "waterHeightCm must not exceed 5000 cm."),
  tankStatus: z.enum(["Empty", "Low", "Normal", "High", "Full", "Sensor Error"], {
    errorMap: () => ({
      message:
        "tankStatus must be Empty, Low, Normal, High, Full, or Sensor Error.",
    }),
  }),
});

export const ultrasonicReadingSchema = z.object({
  deviceId: z.string().trim().min(1, "deviceId must be a non-empty string."),
  upperTank: tankDataSchema.optional(),
  lowerTank: tankDataSchema.optional(),
  pumpStatus: z
    .enum(["ON", "OFF"], {
      errorMap: () => ({ message: "pumpStatus must be ON or OFF." }),
    })
    .default("OFF"),
  systemEnabled: z.boolean().optional(),
  pumpMode: z.enum(["AUTO", "MANUAL"]).optional(),
  sensorStatus: z.string().optional(),
  failedSensor: z.string().optional(),
  // YF-S201 binary flow presence detection
  waterFlowDetected: z.boolean().nullable().optional(),
  // Electricity source detection (DAWLE = government electricity, MOTEUR = generator / no Dawle signal)
  powerSource: z.enum(["DAWLE", "MOTEUR"]).optional(),
  allowPumpOnMoteur: z.boolean().optional(),
  // Single-tank backward compatibility fields:
  distanceCm: z.number().finite().min(0).max(400).optional(),
  percentage: z.number().finite().min(0).max(100).optional(),
  waterHeightCm: z.number().finite().min(0).max(5000).optional(),
  tankStatus: z
    .enum(["Empty", "Low", "Normal", "High", "Full", "Sensor Error"])
    .optional(),
});

const deviceReadingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  message: {
    message: "Too many sensor readings. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Traces every device request end to end so a silent drop (401, 400, 429)
 * is visible in the backend console instead of only on the ESP32 serial.
 * Logs no secret values.
 */
function traceDeviceRequest(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    console.log(
      `[Telemetry] ${req.method} ${req.originalUrl} ` +
      `from=${req.ip} device=${req.body?.deviceId ?? "unknown"} ` +
      `key=${req.get("x-device-key") ? "present" : "missing"} ` +
      `-> ${res.statusCode} (${Date.now() - startedAt} ms)`
    );
  });

  next();
}

router.post(
  "/ultrasonic",
  traceDeviceRequest,
  deviceReadingLimiter,
  authenticateDevice,
  validateRequest(ultrasonicReadingSchema),
  receiveUltrasonicReading
);

router.get(
  "/ultrasonic/latest",
  authenticate,
  getLatestUltrasonicReading
);

export default router;
