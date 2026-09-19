import { getAnalyticsOverview } from "../services/analyticsService.js";
import { getUserAccessibleDevices } from "../services/deviceAccessService.js";

/**
 * Handles GET requests for analytics overview metrics and historical bucket aggregates.
 */
export async function getAnalytics(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const params = req.validatedParams ?? req.params;

    const range = query.range || "24h";
    const from = query.from;
    const to = query.to;
    let effectiveFrom = from;
    let targetDeviceId = params.deviceId || query.deviceId;

    const accessibleDevices = await getUserAccessibleDevices(req.user);

    if (accessibleDevices.length === 0) {
      return res.status(200).json({
        success: true,
        analytics: null,
        message: "No device assigned.",
      });
    }

    if (targetDeviceId) {
      const owned = accessibleDevices.find((d) => d.deviceId === targetDeviceId);
      if (!owned) {
        const error = new Error("You are not authorized to view analytics for this device.");
        error.statusCode = 403;
        return next(error);
      }
      if (owned.ownerAssignedAt) {
        if (!effectiveFrom || new Date(effectiveFrom) < new Date(owned.ownerAssignedAt)) {
          effectiveFrom = owned.ownerAssignedAt.toISOString();
        }
      }
    } else {
      const owned = accessibleDevices[0];
      targetDeviceId = owned.deviceId;
      if (owned.ownerAssignedAt) {
        if (!effectiveFrom || new Date(effectiveFrom) < new Date(owned.ownerAssignedAt)) {
          effectiveFrom = owned.ownerAssignedAt.toISOString();
        }
      }
    }

    const analytics = await getAnalyticsOverview({
      deviceId: targetDeviceId,
      range,
      from: effectiveFrom,
      to,
    });

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    next(error);
  }
}
