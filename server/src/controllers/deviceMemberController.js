import {
  listDeviceMembers,
  addDeviceMember,
  updateDeviceMember,
  removeDeviceMember,
  getDevicePermission,
} from "../services/deviceAccessService.js";

export async function listDeviceMembersHandler(req, res, next) {
  try {
    const { deviceId } = req.params;

    // Must be a member of this device
    const permission = await getDevicePermission(req.user._id, deviceId);
    if (!permission) {
      const error = new Error("You are not authorized to view members for this device.");
      error.statusCode = 403;
      return next(error);
    }

    const members = await listDeviceMembers(deviceId);
    res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    next(error);
  }
}

export async function addDeviceMemberHandler(req, res, next) {
  try {
    const { deviceId } = req.params;
    const { email, role, nickname } = req.body;

    const member = await addDeviceMember(req, req.user, deviceId, {
      email,
      role,
      nickname,
    });

    res.status(201).json({
      success: true,
      message: `User ${member.user.email} added as a ${member.role}.`,
      member,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDeviceMemberHandler(req, res, next) {
  try {
    const { deviceId, memberId } = req.params;
    const { role, nickname } = req.body;

    const member = await updateDeviceMember(req, req.user, deviceId, memberId, {
      role,
      nickname,
    });

    res.status(200).json({
      success: true,
      message: "Member updated successfully.",
      member,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeDeviceMemberHandler(req, res, next) {
  try {
    const { deviceId, memberId } = req.params;

    const result = await removeDeviceMember(req, req.user, deviceId, memberId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}
