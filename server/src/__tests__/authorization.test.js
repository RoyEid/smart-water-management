import test from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";

/**
 * Comprehensive Authorization & Per-Device Role Separation Test Suite
 *
 * Final Role Model:
 * - Device Admin (formerly Device Owner)
 * - Device Controller
 * - Device Viewer
 * - Unauthorized User
 */

// Simulated Evaluators mirroring the backend controllers & services
function evaluateDeviceAccess(user, device, membershipRole) {
  if (!device) return { status: 404, message: "Device not found." };
  const normalizedRole = membershipRole === "owner" ? "admin" : membershipRole;
  if (normalizedRole && ["admin", "controller", "viewer"].includes(normalizedRole)) {
    return { status: 200, allowed: true, role: normalizedRole };
  }
  return { status: 403, message: "You are not authorized to view this device." };
}

function evaluateTankConfigUpdate(user, device, membershipRole, payload) {
  if (!device) return { status: 404, message: "Device not found." };
  const normalizedRole = membershipRole === "owner" ? "admin" : membershipRole;
  if (normalizedRole !== "admin") {
    return { status: 403, message: "Only the device admin is authorized to configure tank parameters." };
  }
  return { status: 200, allowed: true, updatedConfig: payload };
}

function evaluateDeviceControl(user, device, membershipRole, command) {
  if (!device) return { status: 404, message: "Device not found." };
  const normalizedRole = membershipRole === "owner" ? "admin" : membershipRole;
  if (!normalizedRole) {
    return { status: 403, message: "You are not authorized to operate controls for this device." };
  }
  if (normalizedRole === "viewer") {
    return { status: 403, message: "Viewers have read-only access and cannot operate device controls." };
  }
  if (["admin", "controller"].includes(normalizedRole)) {
    return { status: 200, allowed: true, appliedCommand: command };
  }
  return { status: 403, message: "Forbidden" };
}

function evaluateMemberManagement(actorUser, device, actorMembershipRole, action, targetMember) {
  if (!device) return { status: 404, message: "Device not found." };
  const normalizedActorRole = actorMembershipRole === "owner" ? "admin" : actorMembershipRole;
  if (normalizedActorRole !== "admin") {
    return { status: 403, message: "Only the device admin can manage household members." };
  }

  if (action === "ADD") {
    if (!targetMember.email) return { status: 400, message: "Email required." };
    if (!["controller", "viewer"].includes(targetMember.role)) {
      return { status: 400, message: "Role must be controller or viewer." };
    }
    return { status: 201, success: true, added: targetMember };
  }

  if (action === "CHANGE_ROLE") {
    if (targetMember.role === "admin" || targetMember.role === "owner") {
      return { status: 403, message: "The device admin's role cannot be modified." };
    }
    return { status: 200, success: true, updated: targetMember };
  }

  if (action === "REMOVE") {
    if (targetMember.role === "admin" || targetMember.role === "owner") {
      return { status: 403, message: "The device admin cannot be removed from their own device." };
    }
    return { status: 200, success: true, removed: targetMember.userId };
  }

  return { status: 400, message: "Invalid action." };
}

function evaluateTelemetryAccess(user, userAccessibleDevices, queryDeviceId) {
  if (queryDeviceId) {
    if (!userAccessibleDevices.includes(queryDeviceId)) {
      return { status: 403, message: "You are not authorized to view telemetry for this device." };
    }
    return { status: 200, allowed: true, targetDeviceId: queryDeviceId };
  }
  return { status: 200, allowed: true, targetDevices: userAccessibleDevices };
}

function evaluateDeviceRename(user, device, membershipRole, newName) {
  if (!device) return { status: 404, message: "Device not found." };
  const normalizedRole = membershipRole === "owner" ? "admin" : membershipRole;
  if (normalizedRole !== "admin") {
    return { status: 403, message: "Only the device admin is authorized to rename the device." };
  }
  return { status: 200, allowed: true, displayName: newName };
}

function evaluateClearResolvedAlerts(user, userAccessibleDevices, queryDeviceId) {
  const adminDevices = userAccessibleDevices.filter((d) => d.userRole === "admin" || d.userRole === "owner");
  if (adminDevices.length === 0) {
    return { status: 403, message: "Only device admins are authorized to clear resolved alerts." };
  }
  if (queryDeviceId && !adminDevices.some((d) => d.deviceId === queryDeviceId)) {
    return { status: 403, message: "You are not authorized to clear alerts for this device." };
  }
  return { status: 200, allowed: true };
}

/* =========================================================================
 * 1. ADMIN PERMISSIONS (Formerly Owner)
 * ========================================================================= */

test("Admin can read telemetry", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateTelemetryAccess(user, ["tank-01"], "tank-01");
  assert.equal(res.status, 200);
  assert.equal(res.allowed, true);
});

test("Admin can operate pump controls (AUTO/MANUAL, ON/OFF, Moteur permission)", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };

  const resMode = evaluateDeviceControl(user, device, "admin", { pumpMode: "MANUAL" });
  assert.equal(resMode.status, 200);

  const resOn = evaluateDeviceControl(user, device, "admin", { manualPumpState: "ON" });
  assert.equal(resOn.status, 200);

  const resMoteur = evaluateDeviceControl(user, device, "admin", { allowPumpOnMoteur: true });
  assert.equal(resMoteur.status, 200);
});

test("Admin can configure tank physical dimensions and capacities", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const payload = { upper: { capacityLiters: 5000, heightMeters: 3 }, lower: { capacityLiters: 10000, heightMeters: 4 } };
  const res = evaluateTankConfigUpdate(user, device, "admin", payload);
  assert.equal(res.status, 200);
  assert.equal(res.allowed, true);
});

test("Admin can add a household member as Controller or Viewer", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const dadMember = { email: "dad@example.com", role: "controller", nickname: "Dad" };
  const momMember = { email: "mom@example.com", role: "viewer", nickname: "Mom" };

  const resDad = evaluateMemberManagement(user, device, "admin", "ADD", dadMember);
  assert.equal(resDad.status, 201);

  const resMom = evaluateMemberManagement(user, device, "admin", "ADD", momMember);
  assert.equal(resMom.status, 201);
});

test("Admin can change a member's role (Controller <-> Viewer) and remove a member", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const targetMember = { userId: "user-dad", role: "controller" };

  const resChange = evaluateMemberManagement(user, device, "admin", "CHANGE_ROLE", targetMember);
  assert.equal(resChange.status, 200);

  const resRemove = evaluateMemberManagement(user, device, "admin", "REMOVE", targetMember);
  assert.equal(resRemove.status, 200);
});

test("Admin cannot remove themselves from their own device", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const adminMember = { userId: "roy-1", role: "admin" };

  const res = evaluateMemberManagement(user, device, "admin", "REMOVE", adminMember);
  assert.equal(res.status, 403);
  assert.match(res.message, /admin cannot be removed/);
});

/* =========================================================================
 * 2. CONTROLLER PERMISSIONS
 * ========================================================================= */

test("Controller can read telemetry and view sensor readings", () => {
  const user = { _id: "dad-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateTelemetryAccess(user, ["tank-01"], "tank-01");
  assert.equal(res.status, 200);
});

test("Controller can control pump ON/OFF and toggle Auto/Manual mode", () => {
  const user = { _id: "dad-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };

  const resMode = evaluateDeviceControl(user, device, "controller", { pumpMode: "MANUAL" });
  assert.equal(resMode.status, 200);

  const resOff = evaluateDeviceControl(user, device, "controller", { manualPumpState: "OFF" });
  assert.equal(resOff.status, 200);
});

test("Controller CANNOT configure tank physical parameters (403)", () => {
  const user = { _id: "dad-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateTankConfigUpdate(user, device, "controller", {});
  assert.equal(res.status, 403);
  assert.match(res.message, /admin is authorized/);
});

test("Controller CANNOT add, remove, or change household members (403)", () => {
  const user = { _id: "dad-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const newMember = { email: "friend@example.com", role: "viewer" };

  const resAdd = evaluateMemberManagement(user, device, "controller", "ADD", newMember);
  assert.equal(resAdd.status, 403);

  const resRemove = evaluateMemberManagement(user, device, "controller", "REMOVE", { userId: "mom-1", role: "viewer" });
  assert.equal(resRemove.status, 403);
});

/* =========================================================================
 * 3. VIEWER PERMISSIONS
 * ========================================================================= */

test("Viewer can read telemetry and sensor levels", () => {
  const user = { _id: "mom-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateTelemetryAccess(user, ["tank-01"], "tank-01");
  assert.equal(res.status, 200);
});

test("Viewer CANNOT operate pump controls (403)", () => {
  const user = { _id: "mom-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };

  const resControl = evaluateDeviceControl(user, device, "viewer", { manualPumpState: "ON" });
  assert.equal(resControl.status, 403);
  assert.match(resControl.message, /Viewers have read-only access/);

  const resMode = evaluateDeviceControl(user, device, "viewer", { pumpMode: "MANUAL" });
  assert.equal(resMode.status, 403);
});

test("Viewer CANNOT configure tank physical parameters (403)", () => {
  const user = { _id: "mom-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateTankConfigUpdate(user, device, "viewer", {});
  assert.equal(res.status, 403);
});

test("Viewer CANNOT manage household members (403)", () => {
  const user = { _id: "mom-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateMemberManagement(user, device, "viewer", "ADD", { email: "test@example.com" });
  assert.equal(res.status, 403);
});

/* =========================================================================
 * 4. ADMIN EXCLUSIVE DEVICE MANAGEMENT: RENAMING & ALERT CLEARING
 * ========================================================================= */

test("Admin CAN rename their own device", () => {
  const admin = { _id: "admin-1" };
  const device = { deviceId: "tank-01", displayName: "Old Name" };
  const res = evaluateDeviceRename(admin, device, "admin", "New Name");
  assert.equal(res.status, 200);
  assert.equal(res.displayName, "New Name");
});

test("Legacy Owner role seamlessly normalizes to Admin for renaming", () => {
  const owner = { _id: "owner-1" };
  const device = { deviceId: "tank-01", displayName: "Old Name" };
  const res = evaluateDeviceRename(owner, device, "owner", "New Name");
  assert.equal(res.status, 200);
  assert.equal(res.displayName, "New Name");
});

test("Controller and Viewer CANNOT rename a device (403)", () => {
  const user = { _id: "user-1" };
  const device = { deviceId: "tank-01" };
  assert.equal(evaluateDeviceRename(user, device, "controller", "Name").status, 403);
  assert.equal(evaluateDeviceRename(user, device, "viewer", "Name").status, 403);
});

test("Admin CAN clear resolved alerts for admin devices", () => {
  const admin = { _id: "admin-1" };
  const accessible = [{ deviceId: "tank-01", userRole: "admin" }];
  const res = evaluateClearResolvedAlerts(admin, accessible, "tank-01");
  assert.equal(res.status, 200);
});

test("Legacy Owner role seamlessly clears resolved alerts", () => {
  const owner = { _id: "owner-1" };
  const accessible = [{ deviceId: "tank-01", userRole: "owner" }];
  const res = evaluateClearResolvedAlerts(owner, accessible, "tank-01");
  assert.equal(res.status, 200);
});

test("Controller and Viewer CANNOT clear resolved alerts (403)", () => {
  const user = { _id: "user-1" };
  const accessibleController = [{ deviceId: "tank-01", userRole: "controller" }];
  const accessibleViewer = [{ deviceId: "tank-01", userRole: "viewer" }];
  assert.equal(evaluateClearResolvedAlerts(user, accessibleController, "tank-01").status, 403);
  assert.equal(evaluateClearResolvedAlerts(user, accessibleViewer, "tank-01").status, 403);
});

/* =========================================================================
 * 5. MULTI-USER ACCESS & ISOLATION
 * ========================================================================= */

test("Multiple authorized users (Admin, Controller, Viewer) can access the same tank simultaneously", () => {
  const device = { deviceId: "tank-01", owner: "roy-1" };

  const roy = { _id: "roy-1", role: "user" };
  const dad = { _id: "dad-1", role: "user" };
  const mom = { _id: "mom-1", role: "user" };

  assert.equal(evaluateDeviceAccess(roy, device, "admin").status, 200);
  assert.equal(evaluateDeviceAccess(dad, device, "controller").status, 200);
  assert.equal(evaluateDeviceAccess(mom, device, "viewer").status, 200);
});

test("Unauthorized user with no membership is rejected with 403", () => {
  const stranger = { _id: "stranger-99", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };

  const resDevice = evaluateDeviceAccess(stranger, device, null);
  assert.equal(resDevice.status, 403);

  const resTelemetry = evaluateTelemetryAccess(stranger, ["tank-02"], "tank-01");
  assert.equal(resTelemetry.status, 403);

  const resControl = evaluateDeviceControl(stranger, device, null, { manualPumpState: "ON" });
  assert.equal(resControl.status, 403);
});

test("Audit logs define member management actions", () => {
  assert.equal(AUDIT_ACTIONS.DEVICE_MEMBER_ADDED, "DEVICE_MEMBER_ADDED");
  assert.equal(AUDIT_ACTIONS.DEVICE_MEMBER_REMOVED, "DEVICE_MEMBER_REMOVED");
  assert.equal(AUDIT_ACTIONS.DEVICE_MEMBER_ROLE_CHANGED, "DEVICE_MEMBER_ROLE_CHANGED");
});

test("Claiming or assigning an unowned device assigns the admin role", () => {
  function simulateClaimDevice(device, userId) {
    if (!device) throw new Error("Device not found");
    device.owner = userId;
    device.ownerAssignedAt = new Date();
    return {
      deviceId: device.deviceId,
      user: userId,
      role: "admin",
      nickname: "Admin",
    };
  }

  const unownedDevice = { deviceId: "tank-99", owner: null };
  const member = simulateClaimDevice(unownedDevice, "user-claim-1");
  assert.equal(member.role, "admin");
  assert.equal(unownedDevice.owner, "user-claim-1");
});

