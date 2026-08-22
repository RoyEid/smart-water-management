import User from "../models/User.js";
import Device from "../models/Device.js";
import DeviceMember from "../models/DeviceMember.js";
import Alert from "../models/Alert.js";
import AuditLog, { AUDIT_ACTIONS } from "../models/AuditLog.js";
import UltrasonicReading from "../models/UltrasonicReading.js";
import { serializeUser } from "../utils/serializeUser.js";
import { recordAudit } from "../services/auditService.js";
import { getLatestReading } from "../services/ultrasonicReadingService.js";
import { getDeviceControlState } from "../services/deviceControlService.js";
import { isDeviceOnline, DEVICE_ONLINE_WINDOW_MS } from "../services/deviceService.js";
import { sendVerificationEmail } from "../services/emailService.js";
import { generateSixDigitCode } from "../utils/generateCode.js";
import { hashToken } from "../utils/hashToken.js";

/**
 * Every number here is counted from the database or read from the live
 * telemetry service. Nothing on this endpoint is a constant — an empty install
 * legitimately returns zeros rather than a plausible-looking placeholder.
 */
export async function getOverview(req, res, next) {
  try {
    const onlineCutoff = new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS);

    const [
      totalUsers,
      normalUsers,
      adminUsers,
      verifiedUsers,
      disabledUsers,
      totalDevices,
      onlineDevices,
      totalOwners,
      totalMembers,
      totalControllers,
      totalViewers,
      totalTelemetryRecords,
      openAlerts,
      criticalAlerts,
      recentUsers,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isActive: false }),
      Device.countDocuments({}),
      Device.countDocuments({ lastSeenAt: { $gte: onlineCutoff } }),
      DeviceMember.countDocuments({ role: "owner" }),
      DeviceMember.countDocuments({}),
      DeviceMember.countDocuments({ role: "controller" }),
      DeviceMember.countDocuments({ role: "viewer" }),
      UltrasonicReading.estimatedDocumentCount(),
      Alert.countDocuments({ isResolved: false }),
      Alert.countDocuments({ isResolved: false, severity: "critical" }),
      User.find({}).sort({ createdAt: -1 }).limit(5).lean(),
      AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const latestReading = getLatestReading();
    const control = getDeviceControlState();

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          normal: normalUsers,
          admins: adminUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers,
          disabled: disabledUsers,
        },
        memberships: {
          totalOwners,
          totalMembers,
          totalControllers,
          totalViewers,
        },
        devices: {
          total: totalDevices,
          online: onlineDevices,
          offline: totalDevices - onlineDevices,
        },
        telemetry: {
          totalRecords: totalTelemetryRecords,
          latestAt: latestReading?.receivedAt ?? null,
        },
        alerts: {
          open: openAlerts,
          critical: criticalAlerts,
        },
        pump: {
          status: latestReading?.pumpStatus ?? null,
          mode: control.pumpMode,
          systemEnabled: control.systemEnabled,
          manualPumpState: control.manualPumpState,
          deviceOnline: latestReading?.isOnline ?? false,
        },
      },
      recentUsers: recentUsers.map(serializeUser),
      recentActivity: recentActivity.map(serializeAuditEntry),
    });
  } catch (error) {
    next(error);
  }
}

function serializeAuditEntry(entry) {
  return {
    id: String(entry._id),
    actorId: entry.actorId ? String(entry.actorId) : null,
    actorEmail: entry.actorEmail,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    metadata: entry.metadata ?? {},
    ip: entry.ip,
    createdAt: entry.createdAt,
  };
}

export async function listUsers(req, res, next) {
  try {
    const { search, role, status, page, limit } = req.query;
    const pageNumber = page;
    const pageSize = limit;

    const filter = {};

    if (search) {
      // Escaped so a user typing "a+b" or "(" gets a literal search instead of
      // a regex error or an unintended pattern.
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    if (role) filter.role = role;
    if (status === "verified") filter.isVerified = true;
    if (status === "unverified") filter.isVerified = false;
    if (status === "active") filter.isActive = { $ne: false };
    if (status === "disabled") filter.isActive = false;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      users: users.map(serializeUser),
      pagination: buildPagination(pageNumber, pageSize, total),
    });
  } catch (error) {
    next(error);
  }
}

function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

export async function getUserDetails(req, res, next) {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      return next(error);
    }

    const activity = await AuditLog.find({ actorId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      user: serializeUser(user),
      activity: activity.map(serializeAuditEntry),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Guards the "last administrator" invariant.
 *
 * Both demotion and deletion can strand an installation with no admin, so both
 * paths call this rather than each re-deriving the rule. Counting excludes the
 * target itself, so the question asked is exactly "would any admin remain?".
 */
async function wouldRemoveLastAdmin(targetUser) {
  if (targetUser.role !== "admin") return false;
  const otherAdmins = await User.countDocuments({
    role: "admin",
    _id: { $ne: targetUser._id },
  });
  return otherAdmins === 0;
}

export async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      return next(error);
    }

    if (user.role === role) {
      return res.status(200).json({
        success: true,
        message: `This account is already ${role === "admin" ? "an administrator" : "a standard user"}.`,
        user: serializeUser(user),
      });
    }

    if (role !== "admin" && (await wouldRemoveLastAdmin(user))) {
      const error = new Error(
        "This is the last administrator account. Promote another user to administrator before changing this one."
      );
      error.statusCode = 409;
      return next(error);
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await recordAudit({
      req,
      action: AUDIT_ACTIONS.ROLE_CHANGED,
      targetType: "user",
      targetId: user._id,
      targetLabel: user.email,
      metadata: { from: previousRole, to: role },
    });

    res.status(200).json({
      success: true,
      message: `Role updated to ${role}.`,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      return next(error);
    }

    // Disabling yourself would immediately lock you out of the admin area with
    // no way back in from the UI, so it is refused outright.
    if (String(user._id) === String(req.user._id) && isActive === false) {
      const error = new Error("You cannot disable your own account.");
      error.statusCode = 409;
      return next(error);
    }

    if (isActive === false && (await wouldRemoveLastAdmin(user))) {
      const error = new Error(
        "This is the last administrator account and cannot be disabled."
      );
      error.statusCode = 409;
      return next(error);
    }

    user.isActive = isActive;
    await user.save();

    await recordAudit({
      req,
      action: isActive ? AUDIT_ACTIONS.ACCOUNT_ENABLED : AUDIT_ACTIONS.ACCOUNT_DISABLED,
      targetType: "user",
      targetId: user._id,
      targetLabel: user.email,
      metadata: { isActive },
    });

    res.status(200).json({
      success: true,
      message: isActive ? "Account enabled." : "Account disabled.",
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      return next(error);
    }

    if (String(user._id) === String(req.user._id)) {
      const error = new Error(
        "You cannot delete your own account from the admin panel. Use Settings › Danger Zone instead."
      );
      error.statusCode = 409;
      return next(error);
    }

    if (await wouldRemoveLastAdmin(user)) {
      const error = new Error(
        "This is the last administrator account and cannot be deleted."
      );
      error.statusCode = 409;
      return next(error);
    }

    const deletedEmail = user.email;
    await User.findByIdAndDelete(user._id);

    // The audit row deliberately outlives the account: it records who removed
    // it and when, which is the whole point of an audit trail.
    await recordAudit({
      req,
      action: AUDIT_ACTIONS.ACCOUNT_DELETED,
      targetType: "user",
      targetId: user._id,
      targetLabel: deletedEmail,
      metadata: { role: user.role },
    });

    res.status(200).json({
      success: true,
      message: `Account ${deletedEmail} deleted.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function resendUserVerification(req, res, next) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      return next(error);
    }

    if (user.isVerified) {
      const error = new Error("This account is already verified.");
      error.statusCode = 400;
      return next(error);
    }

    const rawCode = generateSixDigitCode();
    user.emailVerificationCodeHash = hashToken(rawCode);
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.emailVerificationAttempts = 0;
    await user.save();

    await sendVerificationEmail(user.email, user.name, rawCode);

    await recordAudit({
      req,
      action: AUDIT_ACTIONS.VERIFICATION_RESENT,
      targetType: "user",
      targetId: user._id,
      targetLabel: user.email,
    });

    res.status(200).json({
      success: true,
      message: `Verification code resent to ${user.email}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAuditLog(req, res, next) {
  try {
    const { action, actorEmail, from, to, page, limit } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (actorEmail) {
      const escaped = String(actorEmail).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.actorEmail = new RegExp(escaped, "i");
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const [entries, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      entries: entries.map(serializeAuditEntry),
      pagination: buildPagination(page, limit, total),
      availableActions: Object.values(AUDIT_ACTIONS),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Read-only view of the runtime configuration an admin may need to diagnose a
 * deployment. Values that are secrets are reported as "configured / not
 * configured" only — never echoed back.
 */
export async function getSystemConfig(req, res, next) {
  try {
    const latestReading = getLatestReading();

    res.status(200).json({
      success: true,
      config: {
        environment: process.env.NODE_ENV || "development",
        deviceApiKeyConfigured: Boolean(process.env.DEVICE_API_KEY),
        jwtConfigured: Boolean(
          process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
        ),
        emailMode: process.env.EMAIL_MODE || "console",
        googleOAuthConfigured: Boolean(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ),
        githubOAuthConfigured: Boolean(
          process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ),
        frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || null,
        cookieSameSite: process.env.COOKIE_SAME_SITE || "lax",
        trustProxy: process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1",
      },
      // The hardware constants the dashboard explains, surfaced so an admin can
      // confirm the UI and the firmware agree. Changing them here does nothing:
      // the firmware owns them, this is a read-only mirror.
      hardware: {
        pumpStartUpperLevel: 20.0,
        pumpStopUpperLevel: 90.0,
        pumpStartLowerMinLevel: 20.0,
        pumpSafetyStopLowerLevel: 10.0,
        deviceOnlineWindowMs: DEVICE_ONLINE_WINDOW_MS,
      },
      runtime: {
        uptimeSeconds: Math.floor(process.uptime()),
        control: getDeviceControlState(),
        latestTelemetryAt: latestReading?.receivedAt ?? null,
        deviceOnline: latestReading?.isOnline ?? false,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTelemetryStats(req, res, next) {
  try {
    const devices = await Device.find({})
      .populate("owner", "name email")
      .sort({ lastSeenAt: -1 })
      .lean();

    const memberStats = await DeviceMember.aggregate([
      {
        $group: {
          _id: "$deviceId",
          totalMembers: { $sum: 1 },
          controllers: { $sum: { $cond: [{ $eq: ["$role", "controller"] }, 1, 0] } },
          viewers: { $sum: { $cond: [{ $eq: ["$role", "viewer"] }, 1, 0] } },
        },
      },
    ]);

    const memberMap = new Map(memberStats.map((m) => [m._id, m]));

    const perDevice = await Promise.all(
      devices.map(async (device) => {
        const stats = memberMap.get(device.deviceId) || {
          totalMembers: device.owner ? 1 : 0,
          controllers: 0,
          viewers: 0,
        };

        const [count, oldest, newest] = await Promise.all([
          UltrasonicReading.countDocuments({ deviceId: device.deviceId }),
          UltrasonicReading.findOne({ deviceId: device.deviceId })
            .sort({ receivedAt: 1 })
            .select("receivedAt")
            .lean(),
          UltrasonicReading.findOne({ deviceId: device.deviceId })
            .sort({ receivedAt: -1 })
            .select("receivedAt")
            .lean(),
        ]);

        return {
          deviceId: device.deviceId,
          displayName: device.displayName || device.deviceId,
          owner: device.owner
            ? {
                id: String(device.owner._id || device.owner),
                name: device.owner.name || "Owner",
                email: device.owner.email || "",
              }
            : null,
          membersCount: stats.totalMembers,
          controllersCount: stats.controllers,
          viewersCount: stats.viewers,
          isOnline: isDeviceOnline(device.lastSeenAt),
          lastSeenAt: device.lastSeenAt ?? null,
          firmwareVersion: device.firmwareVersion ?? null,
          records: count,
          oldestAt: oldest?.receivedAt ?? null,
          newestAt: newest?.receivedAt ?? null,
        };
      })
    );

    res.status(200).json({
      success: true,
      totalRecords: await UltrasonicReading.estimatedDocumentCount(),
      devices: perDevice,
    });
  } catch (error) {
    next(error);
  }
}

