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

const ultrasonicReadingSchema = z
  .object({
    deviceId: z.string().trim().min(1, "deviceId must be a non-empty string."),
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
      .max(50, "waterHeightCm must not exceed 50 cm."),
    tankStatus: z.enum(["Empty", "Low", "Normal", "High", "Full", "Sensor Error"], {
      errorMap: () => ({ message: "tankStatus must be Empty, Low, Normal, High, Full, or Sensor Error." }),
    }),
    pumpStatus: z.enum(["ON", "OFF"], {
      errorMap: () => ({ message: "pumpStatus must be ON or OFF." }),
    }),
  })
  .strict();

const deviceReadingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  message: {
    message: "Too many sensor readings. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/ultrasonic",
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
