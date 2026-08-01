import Alert from "../models/Alert.js";

function serializeAlert(alert) {
  return {
    id: String(alert._id),
    deviceId: alert.deviceId,
    code: alert.code,
    severity: alert.severity,
    message: alert.message,
    context: alert.context ?? {},
    isRead: Boolean(alert.isRead),
    isResolved: Boolean(alert.isResolved),
    firstSeenAt: alert.firstSeenAt,
    lastSeenAt: alert.lastSeenAt,
    resolvedAt: alert.resolvedAt ?? null,
    occurrences: alert.occurrences ?? 1,
  };
}

export async function listAlerts(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const { severity, state, deviceId, page, limit } = query;

    const filter = {};
    if (severity) filter.severity = severity;
    if (deviceId) filter.deviceId = deviceId;
    if (state === "unread") filter.isRead = false;
    if (state === "read") filter.isRead = true;
    if (state === "active") filter.isResolved = false;
    if (state === "resolved") filter.isResolved = true;

    const [alerts, total, unreadCount, activeCount] = await Promise.all([
      Alert.find(filter)
        .sort({ lastSeenAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
      // Counts are for the whole collection, not the filtered page — the bell
      // badge must not change just because the user filtered the list.
      Alert.countDocuments({ isRead: false }),
      Alert.countDocuments({ isResolved: false }),
    ]);

    res.status(200).json({
      success: true,
      alerts: alerts.map(serializeAlert),
      counts: { unread: unreadCount, active: activeCount },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Compact feed for the notification bell: the most recent alerts plus the
 * unread badge count, in one request instead of a list call the dropdown would
 * have to trim client-side.
 */
export async function getRecentAlerts(req, res, next) {
  try {
    const [alerts, unreadCount] = await Promise.all([
      Alert.find({}).sort({ lastSeenAt: -1 }).limit(8).lean(),
      Alert.countDocuments({ isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      alerts: alerts.map(serializeAlert),
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAlertRead(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      const error = new Error("Alert not found.");
      error.statusCode = 404;
      return next(error);
    }

    alert.isRead = true;
    await alert.save();

    const unreadCount = await Alert.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      alert: serializeAlert(alert),
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllAlertsRead(req, res, next) {
  try {
    const result = await Alert.updateMany(
      { isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} alert(s) marked as read.`,
      updated: result.modifiedCount,
      unreadCount: 0,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Clears only alerts whose condition has already ended.
 *
 * An active alert is never deleted: it describes something that is still true
 * about the hardware right now, and removing it would hide a live fault.
 */
export async function clearResolvedAlerts(req, res, next) {
  try {
    const result = await Alert.deleteMany({ isResolved: true });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} resolved alert(s) cleared.`,
      deleted: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
}
