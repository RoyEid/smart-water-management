import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/authenticate.js";
import validateRequest from "../middleware/validateRequest.js";
import validateParams from "../middleware/validateParams.js";
import validateQuery from "../middleware/validateQuery.js";
import { paginationSchema, isoDate, objectIdParam } from "../utils/validationSchemas.js";
import {
  listDevices,
  getDevice,
  renameDevice,
  updateTankConfig,
} from "../controllers/deviceController.js";
import {
  listDeviceMembersHandler,
  addDeviceMemberHandler,
  updateDeviceMemberHandler,
  removeDeviceMemberHandler,
} from "../controllers/deviceMemberController.js";
import {
  listTelemetryHistory,
  exportTelemetryHistory,
} from "../controllers/telemetryHistoryController.js";
import { getAnalytics } from "../controllers/analyticsController.js";
const router = Router();

const deviceIdParamSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(1, "deviceId is required.")
    .max(64, "deviceId is too long.")
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

const singleTankParamSchema = z.object({
  capacityLiters: z
    .number({ invalid_type_error: "capacityLiters must be a number." })
    .finite("capacityLiters must be a finite number.")
    .gt(0, "capacityLiters must be greater than 0.")
    .max(1000000, "capacityLiters cannot exceed 1,000,000 Liters."),
  heightMeters: z
    .number({ invalid_type_error: "heightMeters must be a number." })
    .finite("heightMeters must be a finite number.")
    .gt(0, "heightMeters must be greater than 0.")
    .max(50, "heightMeters cannot exceed 50 Meters."),
});

const tankConfigSchema = z
  .object({
    upper: singleTankParamSchema,
    lower: singleTankParamSchema,
  })
  .strict();

const historyQuerySchema = z.object({
  ...paginationSchema,
  deviceId: z.string().trim().max(64).optional(),
  tank: z.enum(["upper", "lower"]).optional(),
  pumpStatus: z.enum(["ON", "OFF"]).optional(),
  pumpMode: z.enum(["AUTO", "MANUAL"]).optional(),
  powerSource: z.enum(["DAWLE", "MOTEUR"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  minLevel: z.coerce.number().min(0).max(100).optional(),
  maxLevel: z.coerce.number().min(0).max(100).optional(),
});

const exportQuerySchema = historyQuerySchema.omit({ page: true, limit: true });

export const analyticsQuerySchema = z.object({
  deviceId: z.string().trim().max(64).optional(),
  range: z.enum(["24h", "7d", "30d", "all"]).default("24h"),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

// Reading device state, history, and analytics is available to any signed-in user; only
// renaming, which changes shared state, requires an administrator.
router.get("/", requireAuth, listDevices);

router.get(
  "/telemetry/analytics",
  requireAuth,
  validateQuery(analyticsQuerySchema),
  getAnalytics
);

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
  "/:deviceId/analytics",
  requireAuth,
  validateParams(deviceIdParamSchema),
  validateQuery(analyticsQuerySchema),
  getAnalytics
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

const addMemberSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
    role: z.enum(["controller", "viewer"], {
      errorMap: () => ({ message: "Role must be controller or viewer." }),
    }),
    nickname: z.string().trim().max(50).optional(),
  })
  .strict();

const updateMemberSchema = z
  .object({
    role: z.enum(["controller", "viewer"]).optional(),
    nickname: z.string().trim().max(50).optional(),
  })
  .strict();

const memberParamSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(1, "deviceId is required.")
    .max(64, "deviceId is too long.")
    .regex(/^[A-Za-z0-9_-]+$/, "deviceId contains unsupported characters."),
  memberId: objectIdParam,
});

router.put(
  "/:deviceId/tanks",
  requireAuth,
  validateParams(deviceIdParamSchema),
  validateRequest(tankConfigSchema),
  updateTankConfig
);

/* Household member management (Owner only) */
router.get(
  "/:deviceId/members",
  requireAuth,
  validateParams(deviceIdParamSchema),
  listDeviceMembersHandler
);

router.post(
  "/:deviceId/members",
  requireAuth,
  validateParams(deviceIdParamSchema),
  validateRequest(addMemberSchema),
  addDeviceMemberHandler
);

router.patch(
  "/:deviceId/members/:memberId",
  requireAuth,
  validateParams(memberParamSchema),
  validateRequest(updateMemberSchema),
  updateDeviceMemberHandler
);

router.delete(
  "/:deviceId/members/:memberId",
  requireAuth,
  validateParams(memberParamSchema),
  removeDeviceMemberHandler
);

export default router;

