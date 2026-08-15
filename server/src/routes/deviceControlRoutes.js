import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import {
  getDeviceControl,
  updateDeviceControl,
} from "../controllers/deviceControlController.js";
import authenticate from "../middleware/authenticate.js";
import authenticateDevice from "../middleware/authenticateDevice.js";
import validateRequest from "../middleware/validateRequest.js";

const router = Router();

const deviceControlSchema = z
  .object({
    systemEnabled: z.boolean({ invalid_type_error: "systemEnabled must be a boolean." }).optional(),
    pumpMode: z.enum(["AUTO", "MANUAL"], {
      errorMap: () => ({ message: "pumpMode must be AUTO or MANUAL." }),
    }).optional(),
    manualPumpState: z.enum(["ON", "OFF"], {
      errorMap: () => ({ message: "manualPumpState must be ON or OFF." }),
    }).optional(),
    allowPumpOnMoteur: z.boolean({ invalid_type_error: "allowPumpOnMoteur must be a boolean." }).optional(),
  })
  .strict();

/**
 * Bounds how fast pump commands can be issued. Generous enough that a user
 * toggling controls never hits it, tight enough that a stuck client cannot
 * hammer the relay state. Reads are deliberately not limited: the ESP32 polls
 * the GET route every 2 s and must never be throttled.
 */
const controlWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    message: "Too many control commands. Please wait a moment and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Two callers share this endpoint: the ESP32 (device key header) and the
 * dashboard (session cookie). The header decides which credential is checked,
 * so neither path can be satisfied by the other's credential.
 *
 * Previously this existed twice under two names with identical bodies.
 */
function authenticateControlClient(req, res, next) {
  if (req.get("x-device-key")) {
    return authenticateDevice(req, res, next);
  }
  return authenticate(req, res, next);
}

router.get("/", authenticateControlClient, getDeviceControl);

router.put(
  "/",
  authenticateControlClient,
  controlWriteLimiter,
  validateRequest(deviceControlSchema),
  updateDeviceControl
);

router.post(
  "/",
  authenticateControlClient,
  controlWriteLimiter,
  validateRequest(deviceControlSchema),
  updateDeviceControl
);

export default router;
