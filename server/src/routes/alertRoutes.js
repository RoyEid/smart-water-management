import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/authenticate.js";
import validateQuery from "../middleware/validateQuery.js";
import validateParams from "../middleware/validateParams.js";
import { paginationSchema, objectIdParam } from "../utils/validationSchemas.js";
import { ALERT_SEVERITIES } from "../models/Alert.js";
import {
  listAlerts,
  getRecentAlerts,
  markAlertRead,
  markAllAlertsRead,
  clearResolvedAlerts,
} from "../controllers/alertController.js";

const router = Router();

const listQuerySchema = z.object({
  ...paginationSchema,
  severity: z.enum(ALERT_SEVERITIES).optional(),
  state: z.enum(["unread", "read", "active", "resolved"]).optional(),
  deviceId: z.string().trim().max(64).optional(),
});

const idParamSchema = z.object({ id: objectIdParam });

router.get("/", requireAuth, validateQuery(listQuerySchema), listAlerts);

router.get("/recent", requireAuth, getRecentAlerts);

router.patch(
  "/:id/read",
  requireAuth,
  validateParams(idParamSchema),
  markAlertRead
);

router.patch("/read-all", requireAuth, markAllAlertsRead);

// Deleting history is an administrative action even though it only removes
// already-resolved rows.
router.delete("/resolved", requireAuth, requireAdmin, clearResolvedAlerts);

export default router;
