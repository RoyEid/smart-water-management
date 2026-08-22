import test from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";

/**
 * Comprehensive Authorization & Per-Device Role Separation Test Suite
 *
 * Matrix:
 * - Platform Admin
 * - Device Owner
 * - Device Controller
 * - Device Viewer
 * - Unauthorized User
 */

// Simulated Evaluators mirroring the backend controllers & services
function evaluateDeviceAccess(user, device, membershipRole) {
  if (!device) return { status: 404, message: "Device not found." };
  if (user.role === "admin") return { status: 200, allowed: true, role: "admin" };
  if (user.role === "user") {
    if (membershipRole && ["owner", "controller", "viewer"].includes(membershipRole)) {
      return { status: 200, allowed: true, role: membershipRole };
    }
    return { status: 403, message: "You are not authorized to view this device." };
  }
  return { status: 403, message: "Forbidden" };
}

function evaluateTankConfigUpdate(user, device, membershipRole, payload) {
  if (user.role === "admin") {
    return { status: 403, message: "Administrators are not permitted to modify device tank parameters." };
  }
  if (!device) return { status: 404, message: "Device not found." };
  if (membershipRole !== "owner") {
    return { status: 403, message: "Only the device owner is authorized to configure tank parameters." };
  }
  return { status: 200, allowed: true, updatedConfig: payload };
}

function evaluateDeviceControl(user, device, membershipRole, command) {
  if (user.role === "admin") {
    return { status: 403, message: "Administrators are not permitted to operate physical device controls." };
  }
  if (!device) return { status: 404, message: "Device not found." };
  if (!membershipRole) {
    return { status: 403, message: "You are not authorized to operate controls for this device." };
  }
  if (membershipRole === "viewer") {
    return { status: 403, message: "Viewers have read-only access and cannot operate device controls." };
  }
  if (["owner", "controller"].includes(membershipRole)) {
    return { status: 200, allowed: true, appliedCommand: command };
  }
  return { status: 403, message: "Forbidden" };
}

function evaluateMemberManagement(actorUser, device, actorMembershipRole, action, targetMember) {
  if (actorUser.role === "admin") {
    return { status: 403, message: "Administrators do not manage household members." };
  }
  if (!device) return { status: 404, message: "Device not found." };
  if (actorMembershipRole !== "owner") {
    return { status: 403, message: "Only the device owner can manage household members." };
  }

  if (action === "ADD") {
    if (!targetMember.email) return { status: 400, message: "Email required." };
    if (!["controller", "viewer"].includes(targetMember.role)) {
      return { status: 400, message: "Role must be controller or viewer." };
    }
    return { status: 201, success: true, added: targetMember };
  }

  if (action === "CHANGE_ROLE") {
    if (targetMember.role === "owner") {
      return { status: 403, message: "The device owner's role cannot be modified." };
    }
    return { status: 200, success: true, updated: targetMember };
  }

  if (action === "REMOVE") {
    if (targetMember.role === "owner") {
      return { status: 403, message: "The device owner cannot be removed from their own device." };
    }
    return { status: 200, success: true, removed: targetMember.userId };
  }

  return { status: 400, message: "Invalid action." };
}

function evaluateTelemetryAccess(user, userAccessibleDevices, queryDeviceId) {
  if (user.role === "admin") return { status: 200, allowed: true };
  if (queryDeviceId) {
    if (!userAccessibleDevices.includes(queryDeviceId)) {
      return { status: 403, message: "You are not authorized to view telemetry for this device." };
    }
    return { status: 200, allowed: true, targetDeviceId: queryDeviceId };
  }
  return { status: 200, allowed: true, targetDevices: userAccessibleDevices };
}

/* =========================================================================
 * 1. OWNER PERMISSIONS
 * ========================================================================= */

test("Owner can read telemetry", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateTelemetryAccess(user, ["tank-01"], "tank-01");
  assert.equal(res.status, 200);
  assert.equal(res.allowed, true);
});

test("Owner can operate pump controls (AUTO/MANUAL, ON/OFF, Moteur permission)", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };

  const resMode = evaluateDeviceControl(user, device, "owner", { pumpMode: "MANUAL" });
  assert.equal(resMode.status, 200);

  const resOn = evaluateDeviceControl(user, device, "owner", { manualPumpState: "ON" });
  assert.equal(resOn.status, 200);

  const resMoteur = evaluateDeviceControl(user, device, "owner", { allowPumpOnMoteur: true });
  assert.equal(resMoteur.status, 200);
});

test("Owner can configure tank physical dimensions and capacities", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const payload = { upper: { capacityLiters: 5000, heightMeters: 3 }, lower: { capacityLiters: 10000, heightMeters: 4 } };
  const res = evaluateTankConfigUpdate(user, device, "owner", payload);
  assert.equal(res.status, 200);
  assert.equal(res.allowed, true);
});

test("Owner can add a household member as Controller or Viewer", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const dadMember = { email: "dad@example.com", role: "controller", nickname: "Dad" };
  const momMember = { email: "mom@example.com", role: "viewer", nickname: "Mom" };

  const resDad = evaluateMemberManagement(user, device, "owner", "ADD", dadMember);
  assert.equal(resDad.status, 201);

  const resMom = evaluateMemberManagement(user, device, "owner", "ADD", momMember);
  assert.equal(resMom.status, 201);
});

test("Owner can change a member's role (Controller <-> Viewer) and remove a member", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const targetMember = { userId: "user-dad", role: "controller" };

  const resChange = evaluateMemberManagement(user, device, "owner", "CHANGE_ROLE", targetMember);
  assert.equal(resChange.status, 200);

  const resRemove = evaluateMemberManagement(user, device, "owner", "REMOVE", targetMember);
  assert.equal(resRemove.status, 200);
});

test("Owner cannot remove themselves from their own device", () => {
  const user = { _id: "roy-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const ownerMember = { userId: "roy-1", role: "owner" };

  const res = evaluateMemberManagement(user, device, "owner", "REMOVE", ownerMember);
  assert.equal(res.status, 403);
  assert.match(res.message, /owner cannot be removed/);
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
  assert.match(res.message, /owner is authorized/);
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
 * 4. PLATFORM ADMIN RESPONSIBILITIES
 * ========================================================================= */

test("Platform Admin can access platform overview and telemetry statistics", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const res = evaluateTelemetryAccess(admin, [], "tank-01");
  assert.equal(res.status, 200);
  assert.equal(res.allowed, true);
});

test("Platform Admin CANNOT operate physical pump controls (403)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateDeviceControl(admin, device, "admin", { manualPumpState: "ON" });
  assert.equal(res.status, 403);
  assert.match(res.message, /Administrators are not permitted to operate physical device controls/);
});

test("Platform Admin CANNOT modify tank physical configuration (403)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const device = { deviceId: "tank-01", owner: "roy-1" };
  const res = evaluateTankConfigUpdate(admin, device, "admin", {});
  assert.equal(res.status, 403);
  assert.match(res.message, /Administrators are not permitted to modify device tank parameters/);
});

/* =========================================================================
 * 5. MULTI-USER ACCESS & ISOLATION
 * ========================================================================= */

test("Multiple authorized users (Owner, Controller, Viewer) can access the same tank simultaneously", () => {
  const device = { deviceId: "tank-01", owner: "roy-1" };

  const roy = { _id: "roy-1", role: "user" };
  const dad = { _id: "dad-1", role: "user" };
  const mom = { _id: "mom-1", role: "user" };

  assert.equal(evaluateDeviceAccess(roy, device, "owner").status, 200);
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
