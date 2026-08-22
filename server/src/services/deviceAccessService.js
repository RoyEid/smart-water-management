import Device from "../models/Device.js";
import DeviceMember from "../models/DeviceMember.js";
import User from "../models/User.js";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";
import { recordAudit } from "./auditService.js";
import {
  sendMemberAddedEmail,
  sendMemberRoleChangedEmail,
  sendMemberRemovedEmail,
} from "./emailService.js";

/**
 * Ensures existing devices with owners in MongoDB have corresponding DeviceMember owner records.
 * Idempotent: safe to run on every server startup without creating duplicates.
 */
export async function syncDeviceMembersOnBoot() {
  try {
    const devices = await Device.find({ owner: { $ne: null } }).lean();
    let syncedCount = 0;

    for (const device of devices) {
      const existing = await DeviceMember.findOne({
        deviceId: device.deviceId,
        user: device.owner,
      });

      if (!existing) {
        await DeviceMember.create({
          device: device._id,
          deviceId: device.deviceId,
          user: device.owner,
          role: "owner",
          nickname: "Owner",
        });
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      console.log(`[Device Access] Synced ${syncedCount} device owner(s) into DeviceMember.`);
    }
  } catch (error) {
    console.error("[Device Access] Failed to sync device members on boot:", error.message);
  }
}

/**
 * Gets all device IDs accessible to a user.
 * For admin: returns all devices in registry.
 * For standard user: returns device IDs where user is owner, controller, or viewer.
 */
export async function getAccessibleDeviceIds(user) {
  if (!user) return [];
  if (user.role === "admin") {
    return Device.find({}).distinct("deviceId");
  }
  return DeviceMember.find({ user: user._id }).distinct("deviceId");
}

/**
 * Gets the specific permission/role of a user on a device.
 * Returns: "owner" | "controller" | "viewer" | null
 */
export async function getDevicePermission(userId, deviceId) {
  if (!userId || !deviceId) return null;
  const membership = await DeviceMember.findOne({ user: userId, deviceId }).lean();
  return membership ? membership.role : null;
}

/**
 * Gets all accessible devices for a user along with the user's role on each device.
 */
export async function getUserAccessibleDevices(user) {
  if (!user) return [];

  if (user.role === "admin") {
    const allDevices = await Device.find({}).sort({ deviceId: 1 }).lean();
    return allDevices.map((d) => ({
      ...d,
      userRole: "admin",
      nickname: "",
    }));
  }

  const memberships = await DeviceMember.find({ user: user._id })
    .populate("device")
    .sort({ createdAt: 1 })
    .lean();

  return memberships
    .filter((m) => m.device)
    .map((m) => ({
      ...m.device,
      userRole: m.role,
      nickname: m.nickname || "",
      memberId: String(m._id),
    }));
}

/**
 * Serializes a DeviceMember document for API response.
 */
export function serializeMember(member) {
  const user = member.user || {};
  return {
    id: String(member._id),
    deviceId: member.deviceId,
    role: member.role,
    nickname: member.nickname || "",
    createdAt: member.createdAt,
    user: {
      id: String(user._id || member.user),
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
      isActive: user.isActive !== false,
      isVerified: Boolean(user.isVerified),
    },
  };
}

/**
 * Lists all members for a device.
 */
export async function listDeviceMembers(deviceId) {
  const members = await DeviceMember.find({ deviceId })
    .populate("user", "name email avatar isActive isVerified")
    .sort({ createdAt: 1 })
    .lean();

  return members.map(serializeMember);
}

/**
 * Adds a new member to a device (Owner only).
 */
export async function addDeviceMember(req, actorUser, deviceId, { email, role, nickname = "" }) {
  // 1. Verify actor is the owner of this device
  const actorRole = await getDevicePermission(actorUser._id, deviceId);
  if (actorRole !== "owner") {
    const error = new Error("Only the device owner can add household members.");
    error.statusCode = 403;
    throw error;
  }

  // 2. Validate role
  if (!["controller", "viewer"].includes(role)) {
    const error = new Error("Member role must be either 'controller' or 'viewer'.");
    error.statusCode = 400;
    throw error;
  }

  // 3. Find target user by email
  const normalizedEmail = String(email).trim().toLowerCase();
  const targetUser = await User.findOne({ email: normalizedEmail });
  if (!targetUser) {
    const error = new Error("No registered account exists with this email address.");
    error.statusCode = 404;
    throw error;
  }

  if (targetUser.isActive === false) {
    const error = new Error("Cannot add a disabled user account.");
    error.statusCode = 400;
    throw error;
  }

  if (targetUser.role === "admin") {
    const error = new Error("Platform administrators cannot be added as household members.");
    error.statusCode = 400;
    throw error;
  }

  // 4. Verify device exists
  const device = await Device.findOne({ deviceId });
  if (!device) {
    const error = new Error("Device not found.");
    error.statusCode = 404;
    throw error;
  }

  // 5. Check if user already has membership on this device
  const existing = await DeviceMember.findOne({ deviceId, user: targetUser._id });
  if (existing) {
    const error = new Error(`User ${targetUser.email} is already a member of this device.`);
    error.statusCode = 409;
    throw error;
  }

  // 6. Create member
  const created = await DeviceMember.create({
    device: device._id,
    deviceId,
    user: targetUser._id,
    role,
    invitedBy: actorUser._id,
    nickname: String(nickname || "").trim(),
  });

  const populated = await DeviceMember.findById(created._id)
    .populate("user", "name email avatar isActive isVerified")
    .lean();

  // 7. Audit log
  await recordAudit({
    req,
    action: AUDIT_ACTIONS.DEVICE_MEMBER_ADDED,
    targetType: "device",
    targetId: deviceId,
    targetLabel: device.displayName || deviceId,
    metadata: {
      addedUserId: String(targetUser._id),
      addedUserEmail: targetUser.email,
      role,
      nickname,
    },
  });

  // 8. Send member added notification email (email failure must not break access grant)
  try {
    await sendMemberAddedEmail({
      email: targetUser.email,
      recipientName: targetUser.name,
      ownerName: actorUser.name || actorUser.email,
      deviceName: device.displayName || deviceId,
      deviceId,
      role,
    });
  } catch (emailError) {
    console.error(
      `[EMAIL] Device member notification failed\nType: MEMBER_ADDED\nRecipient: ${targetUser.email}\nDevice: ${deviceId}\nError: ${emailError.message}`
    );
  }

  return serializeMember(populated);
}

/**
 * Updates a member's role or nickname (Owner only).
 */
export async function updateDeviceMember(req, actorUser, deviceId, memberId, { role, nickname }) {
  // 1. Verify actor is the owner
  const actorRole = await getDevicePermission(actorUser._id, deviceId);
  if (actorRole !== "owner") {
    const error = new Error("Only the device owner can change member permissions.");
    error.statusCode = 403;
    throw error;
  }

  // 2. Find target member
  const member = await DeviceMember.findById(memberId).populate("user", "name email avatar isActive isVerified");
  if (!member || member.deviceId !== deviceId) {
    const error = new Error("Member not found on this device.");
    error.statusCode = 404;
    throw error;
  }

  // 3. Prevent changing the Owner's role
  if (member.role === "owner") {
    const error = new Error("The device owner's role cannot be modified.");
    error.statusCode = 403;
    throw error;
  }

  const previousRole = member.role;

  if (role) {
    if (!["controller", "viewer"].includes(role)) {
      const error = new Error("Role must be 'controller' or 'viewer'.");
      error.statusCode = 400;
      throw error;
    }
    member.role = role;
  }

  if (nickname !== undefined) {
    member.nickname = String(nickname).trim();
  }

  await member.save();

  // 4. Audit log
  if (role && role !== previousRole) {
    await recordAudit({
      req,
      action: AUDIT_ACTIONS.DEVICE_MEMBER_ROLE_CHANGED,
      targetType: "device",
      targetId: deviceId,
      targetLabel: deviceId,
      metadata: {
        memberUserId: String(member.user?._id || member.user),
        memberUserEmail: member.user?.email,
        fromRole: previousRole,
        toRole: role,
      },
    });

    // 5. Send role changed notification email (failure must not break role update)
    if (member.user?.email) {
      try {
        const device = await Device.findOne({ deviceId });
        await sendMemberRoleChangedEmail({
          email: member.user.email,
          recipientName: member.user.name,
          ownerName: actorUser.name || actorUser.email,
          deviceName: device?.displayName || deviceId,
          deviceId,
          previousRole,
          newRole: role,
        });
      } catch (emailError) {
        console.error(
          `[EMAIL] Device member notification failed\nType: ROLE_CHANGED\nRecipient: ${member.user.email}\nDevice: ${deviceId}\nError: ${emailError.message}`
        );
      }
    }
  }

  return serializeMember(member.toObject());
}

/**
 * Removes a member from a device (Owner only).
 */
export async function removeDeviceMember(req, actorUser, deviceId, memberId) {
  // 1. Verify actor is the owner
  const actorRole = await getDevicePermission(actorUser._id, deviceId);
  if (actorRole !== "owner") {
    const error = new Error("Only the device owner can remove household members.");
    error.statusCode = 403;
    throw error;
  }

  // 2. Find target member
  const member = await DeviceMember.findById(memberId).populate("user", "name email");
  if (!member || member.deviceId !== deviceId) {
    const error = new Error("Member not found on this device.");
    error.statusCode = 404;
    throw error;
  }

  // 3. Prevent removing the Owner
  if (member.role === "owner") {
    const error = new Error("The device owner cannot be removed from their own device.");
    error.statusCode = 403;
    throw error;
  }

  const targetEmail = member.user?.email || "unknown";
  const targetName = member.user?.name;
  const targetUserId = String(member.user?._id || member.user);
  const targetRole = member.role;

  await DeviceMember.findByIdAndDelete(memberId);

  // 4. Audit log
  await recordAudit({
    req,
    action: AUDIT_ACTIONS.DEVICE_MEMBER_REMOVED,
    targetType: "device",
    targetId: deviceId,
    targetLabel: deviceId,
    metadata: {
      removedUserId: targetUserId,
      removedUserEmail: targetEmail,
      role: targetRole,
    },
  });

  // 5. Send member removed notification email (failure must not break deletion)
  if (targetEmail && targetEmail !== "unknown") {
    try {
      const device = await Device.findOne({ deviceId });
      await sendMemberRemovedEmail({
        email: targetEmail,
        recipientName: targetName,
        ownerName: actorUser.name || actorUser.email,
        deviceName: device?.displayName || deviceId,
        deviceId,
      });
    } catch (emailError) {
      console.error(
        `[EMAIL] Device member notification failed\nType: MEMBER_REMOVED\nRecipient: ${targetEmail}\nDevice: ${deviceId}\nError: ${emailError.message}`
      );
    }
  }

  return { success: true, message: `Member ${targetEmail} removed from ${deviceId}.` };
}
