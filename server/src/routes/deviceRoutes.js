import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/authenticate.js";
import validateRequest from "../middleware/validateRequest.js";
import validateParams from "../middleware/validateParams.js";
import validateQuery from "../middleware/validateQuery.js";
import { paginationSchema, isoDate } from "../utils/validationSchemas.js";
import {
  listDevices,
  getDevice,
  renameDevice,
} from "../controllers/deviceController.js";
import {
  listTelemetryHistory,
  exportTelemetryHistory,
} from "../controllers/telemetryHistoryController.js";

const router = Router();

const deviceIdParamSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(1, "deviceId is required.")
    .max(64, "deviceId is too long.")
    // Device ids come from firmware constants, so a strict character set is
    // safe here and keeps arbitrary input out of the query.
    .regex(/^[A-Za-z0-9_-]+$/, "deviceId contains unsupported characters."),
});

const renameSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(60, "Display name must not exceed 60 characters."),
  })
  .strict();

const historyQuerySchema = z.object({
  ...paginationSchema,
  deviceId: z.string().trim().max(64).optional(),
  tank: z.enum(["upper", "lower"]).optional(),
  pumpStatus: z.enum(["ON", "OFF"]).optional(),
  pumpMode: z.enum(["AUTO", "MANUAL"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  minLevel: z.coerce.number().min(0).max(100).optional(),
  maxLevel: z.coerce.number().min(0).max(100).optional(),
});

// The CSV export takes the same filters but no pagination — the row cap in the
// controller bounds it instead.
const exportQuerySchema = historyQuerySchema.omit({ page: true, limit: true });

// Reading device state and history is available to any signed-in user; only
// renaming, which changes shared state, requires an administrator.
router.get("/", requireAuth, listDevices);

router.get(
  "/telemetry/history",
  requireAuth,
  validateQuery(historyQuerySchema),
  listTelemetryHistory
);

router.get(
  "/telemetry/export",
  requireAuth,
  validateQuery(exportQuerySchema),
  exportTelemetryHistory
);

router.get(
  "/:deviceId",
  requireAuth,
  validateParams(deviceIdParamSchema),
  getDevice
);

router.patch(
  "/:deviceId",
  requireAuth,
  requireAdmin,
  validateParams(deviceIdParamSchema),
  validateRequest(renameSchema),
  renameDevice
);

export default router;
