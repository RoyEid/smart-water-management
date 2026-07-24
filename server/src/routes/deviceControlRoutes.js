import { Router } from "express";
import { z } from "zod";
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
  })
  .strict();

function authenticateControlReader(req, res, next) {
  if (req.get("x-device-key")) {
    return authenticateDevice(req, res, next);
  }
  return authenticate(req, res, next);
}

function authenticateControlWriter(req, res, next) {
  if (req.get("x-device-key")) {
    return authenticateDevice(req, res, next);
  }
  return authenticate(req, res, next);
}

router.get("/", authenticateControlReader, getDeviceControl);

router.put(
  "/",
  authenticateControlWriter,
  validateRequest(deviceControlSchema),
  updateDeviceControl
);

router.post(
  "/",
  authenticateControlWriter,
  validateRequest(deviceControlSchema),
  updateDeviceControl
);

export default router;
