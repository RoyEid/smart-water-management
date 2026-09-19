import Alert from "../models/Alert.js";
import { getUserAccessibleDevices } from "../services/deviceAccessService.js";

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

function buildUserAlertScope(ownedDevices, specificDeviceId = null) {
  if (ownedDevices.length === 0) return { _id: null };

  if (specificDeviceId) {
    const target = ownedDevices.find((d) => d.deviceId === specificDeviceId);
    if (!target) return { _id: null };
    if (!target.ownerAssignedAt) return { deviceId: target.deviceId };
    return {
      deviceId: target.deviceId,
      $or: [{ isResolved: false }, { firstSeenAt: { $gte: target.ownerAssignedAt } }],
    };
  }

  return {
    $or: ownedDevices.map((d) => {
      if (!d.ownerAssignedAt) return { deviceId: d.deviceId };
      return {
        deviceId: d.deviceId,
        $or: [{ isResolved: false }, { firstSeenAt: { $gte: d.ownerAssignedAt } }],
      };
    }),
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

    let unreadFilter = { isRead: false };
    let activeFilter = { isResolved: false };

    const accessibleDevices = await getUserAccessibleDevices(req.user);

    if (accessibleDevices.length === 0) {
      return res.status(200).json({
        success: true,
        alerts: [],
        counts: { unread: 0, active: 0 },
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    if (deviceId && !accessibleDevices.some((d) => d.deviceId === deviceId)) {
      const error = new Error("You are not authorized to view alerts for this device.");
      error.statusCode = 403;
      return next(error);
    }

    const scope = buildUserAlertScope(accessibleDevices, deviceId);
    Object.assign(filter, scope);
    unreadFilter = { isRead: false, ...scope };
    activeFilter = { isResolved: false, ...scope };

    const [alerts, total, unreadCount, activeCount] = await Promise.all([
      Alert.find(filter)
        .sort({ lastSeenAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
      Alert.countDocuments(unreadFilter),
      Alert.countDocuments(activeFilter),
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
    let filter = {};
    let unreadFilter = { isRead: false };

    const accessibleDevices = await getUserAccessibleDevices(req.user);

    if (accessibleDevices.length === 0) {
      return res.status(200).json({
        success: true,
        alerts: [],
        unreadCount: 0,
      });
    }

    const scope = buildUserAlertScope(accessibleDevices);
    filter = scope;
    unreadFilter = { isRead: false, ...scope };

    const [alerts, unreadCount] = await Promise.all([
      Alert.find(filter).sort({ lastSeenAt: -1 }).limit(8).lean(),
      Alert.countDocuments(unreadFilter),
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

    let unreadFilter = { isRead: false };
    if (req.user?.role === "user") {
      const accessibleDevices = await getUserAccessibleDevices(req.user);

      const target = accessibleDevices.find((d) => d.deviceId === alert.deviceId);
      if (!target) {
        const error = new Error("You are not authorized to manage alerts for this device.");
        error.statusCode = 403;
        return next(error);
      }
      const scope = buildUserAlertScope(accessibleDevices);
      unreadFilter = { isRead: false, ...scope };
    }

    alert.isRead = true;
    await alert.save();

    const unreadCount = await Alert.countDocuments(unreadFilter);

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
    const accessibleDevices = await getUserAccessibleDevices(req.user);

    if (accessibleDevices.length === 0) {
      return res.status(200).json({
        success: true,
        message: "0 alert(s) marked as read.",
        updated: 0,
        unreadCount: 0,
      });
    }

    const filter = { isRead: false, ...buildUserAlertScope(accessibleDevices) };

    const result = await Alert.updateMany(
      filter,
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
    const accessibleDevices = await getUserAccessibleDevices(req.user);
    const adminDevices = accessibleDevices.filter((d) => d.userRole === "admin" || d.userRole === "owner");

    if (adminDevices.length === 0) {
      const error = new Error("Only device admins are authorized to clear resolved alerts.");
      error.statusCode = 403;
      return next(error);
    }

    const queryDeviceId = req.query?.deviceId;
    let deleteFilter = { isResolved: true };

    if (queryDeviceId) {
      if (!adminDevices.some((d) => d.deviceId === queryDeviceId)) {
        const error = new Error("You are not authorized to clear alerts for this device.");
        error.statusCode = 403;
        return next(error);
      }
      deleteFilter.deviceId = queryDeviceId;
    } else {
      deleteFilter.deviceId = { $in: adminDevices.map((d) => d.deviceId) };
    }

    const result = await Alert.deleteMany(deleteFilter);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} resolved alert(s) cleared.`,
      deleted: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
}
