import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth, requireAdmin } from "../middleware/authenticate.js";
import validateRequest from "../middleware/validateRequest.js";
import validateQuery from "../middleware/validateQuery.js";
import validateParams from "../middleware/validateParams.js";
import {
  paginationSchema,
  isoDate,
  objectIdParam,
} from "../utils/validationSchemas.js";
import {
  getOverview,
  listUsers,
  getUserDetails,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  resendUserVerification,
  listAuditLog,
  getSystemConfig,
  getTelemetryStats,
  assignDeviceOwner,
} from "../controllers/adminController.js";

const router = Router();

// Every route below is admin-only. Applying the pair once at router level means
// a route added later cannot accidentally ship without authorization.
router.use(requireAuth, requireAdmin);

// Destructive admin operations are rate limited independently of ordinary
// reads, so a compromised admin session cannot mass-delete at full speed.
const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: "Too many administrative changes. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const listUsersQuerySchema = z.object({
  ...paginationSchema,
  search: z.string().trim().max(120).optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["verified", "unverified", "active", "disabled"]).optional(),
});

const auditQuerySchema = z.object({
  ...paginationSchema,
  action: z.string().trim().max(60).optional(),
  actorEmail: z.string().trim().max(160).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

const idParamSchema = z.object({ id: objectIdParam });

const deviceIdParamSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(1, "deviceId is required.")
    .max(64, "deviceId is too long.")
    .regex(/^[A-Za-z0-9_-]+$/, "deviceId contains unsupported characters."),
});

const assignDeviceSchema = z
  .object({
    userId: objectIdParam.nullable(),
  })
  .strict();

const roleSchema = z
  .object({
    role: z.enum(["user", "admin"], {
      errorMap: () => ({ message: "role must be user or admin." }),
    }),
  })
  .strict();

const statusSchema = z
  .object({
    isActive: z.boolean({ invalid_type_error: "isActive must be a boolean." }),
  })
  .strict();

router.get("/overview", getOverview);

router.get("/users", validateQuery(listUsersQuerySchema), listUsers);

router.get("/users/:id", validateParams(idParamSchema), getUserDetails);

router.patch(
  "/users/:id/role",
  adminWriteLimiter,
  validateParams(idParamSchema),
  validateRequest(roleSchema),
  updateUserRole
);

router.patch(
  "/users/:id/status",
  adminWriteLimiter,
  validateParams(idParamSchema),
  validateRequest(statusSchema),
  updateUserStatus
);

router.post(
  "/users/:id/resend-verification",
  adminWriteLimiter,
  validateParams(idParamSchema),
  resendUserVerification
);

router.delete(
  "/users/:id",
  adminWriteLimiter,
  validateParams(idParamSchema),
  deleteUser
);

router.patch(
  "/devices/:deviceId/assign",
  adminWriteLimiter,
  validateParams(deviceIdParamSchema),
  validateRequest(assignDeviceSchema),
  assignDeviceOwner
);

router.get("/audit-log", validateQuery(auditQuerySchema), listAuditLog);

router.get("/telemetry-stats", getTelemetryStats);

router.get("/config", getSystemConfig);

export default router;
