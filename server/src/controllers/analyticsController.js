import { getAnalyticsOverview } from "../services/analyticsService.js";

/**
 * Handles GET requests for analytics overview metrics and historical bucket aggregates.
 */
export async function getAnalytics(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const params = req.validatedParams ?? req.params;

    const deviceId = params.deviceId || query.deviceId || "tank-01";
    const range = query.range || "24h";
    const from = query.from;
    const to = query.to;

    const analytics = await getAnalyticsOverview({
      deviceId,
      range,
      from,
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
