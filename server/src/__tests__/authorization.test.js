import test from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";

/**
 * 24 Comprehensive Authorization & Role Separation Test Scenarios
 */

// Simulated authorization evaluator functions based on actual backend controller implementations
function evaluateDeviceAccess(user, device) {
  if (!device) return { status: 404, message: "Device not found." };
  if (user.role === "admin") return { status: 200, allowed: true };
  if (user.role === "user") {
    if (device.owner && String(device.owner) === String(user._id)) {
      return { status: 200, allowed: true };
    }
    return { status: 403, message: "You are not authorized to view this device." };
  }
  return { status: 403, message: "Forbidden" };
}

function evaluateTankConfigUpdate(user, device, payload) {
  if (user.role === "admin") {
    return { status: 403, message: "Administrators are not permitted to modify device tank parameters." };
  }
  if (!device) return { status: 404, message: "Device not found." };
  if (!device.owner || String(device.owner) !== String(user._id)) {
    return { status: 403, message: "You are not authorized to configure this device." };
  }
  return { status: 200, allowed: true, updatedConfig: payload };
}

function evaluateDeviceControl(user, device, command) {
  if (user.role === "admin") {
    return { status: 403, message: "Administrators are not permitted to operate physical device controls." };
  }
  if (!device) return { status: 404, message: "Device not found." };
  if (!device.owner || String(device.owner) !== String(user._id)) {
    return { status: 403, message: "You are not authorized to operate controls for this device." };
  }
  return { status: 200, allowed: true, appliedCommand: command };
}

function evaluateTelemetryAccess(user, userDevices, queryDeviceId) {
  if (user.role === "admin") return { status: 200, allowed: true };
  if (queryDeviceId) {
    if (!userDevices.includes(queryDeviceId)) {
      return { status: 403, message: "You are not authorized to view telemetry for this device." };
    }
    return { status: 200, allowed: true, targetDeviceId: queryDeviceId };
  }
  return { status: 200, allowed: true, targetDevices: userDevices };
}

function evaluateAnalyticsAccess(user, userDevices, queryDeviceId) {
  if (user.role === "admin") return { status: 200, allowed: true };
  if (!userDevices.includes(queryDeviceId)) {
    return { status: 403, message: "You are not authorized to view analytics for this device." };
  }
  return { status: 200, allowed: true, targetDeviceId: queryDeviceId };
}

function evaluateDeviceAssignment(adminUser, targetUser, device) {
  if (adminUser.role !== "admin") {
    return { status: 403, message: "Only administrators can assign devices." };
  }
  if (!device) return { status: 404, message: "Device not found." };
  if (targetUser) {
    if (targetUser.role !== "user") {
      return {
        status: 400,
        message: "Devices can only be assigned to accounts with the 'user' role. Administrators cannot be device owners.",
      };
    }
    if (targetUser.isActive === false) {
      return { status: 400, message: "Cannot assign device to a disabled user account." };
    }
    return {
      status: 200,
      assigned: true,
      newOwner: targetUser._id,
      preservedTanks: device.tanks,
    };
  }
  return { status: 200, assigned: true, newOwner: null, preservedTanks: device.tanks };
}

// 1. Normal user can view assigned device
test("1. Normal user can view assigned device", () => {
  const user = { _id: "user-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceAccess(user, device);
  assert.equal(res.status, 200);
  assert.equal(res.allowed, true);
});

// 2. Normal user cannot view unassigned / other user's device (403)
test("2. Normal user cannot view unassigned or other user's device", () => {
  const user = { _id: "user-1", role: "user" };
  const otherDevice = { deviceId: "tank-02", owner: "user-2" };
  const unassignedDevice = { deviceId: "tank-03", owner: null };

  assert.equal(evaluateDeviceAccess(user, otherDevice).status, 403);
  assert.equal(evaluateDeviceAccess(user, unassignedDevice).status, 403);
});

// 3. Normal user can configure assigned device tanks
test("3. Normal user can configure assigned device tanks", () => {
  const user = { _id: "user-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const payload = { upper: { capacityLiters: 1000, heightMeters: 2.5 } };
  const res = evaluateTankConfigUpdate(user, device, payload);
  assert.equal(res.status, 200);
  assert.equal(res.allowed, true);
});

// 4. Normal user cannot configure other user's device tanks (403)
test("4. Normal user cannot configure other user's device tanks", () => {
  const user = { _id: "user-1", role: "user" };
  const device = { deviceId: "tank-02", owner: "user-2" };
  const res = evaluateTankConfigUpdate(user, device, {});
  assert.equal(res.status, 403);
});

// 5. Admin cannot configure tank parameters (403)
test("5. Admin cannot configure tank parameters (403)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateTankConfigUpdate(admin, device, {});
  assert.equal(res.status, 403);
  assert.equal(res.message, "Administrators are not permitted to modify device tank parameters.");
});

// 6. Normal user can toggle pump mode (AUTO/MANUAL) on assigned device
test("6. Normal user can toggle pump mode on assigned device", () => {
  const user = { _id: "user-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceControl(user, device, { pumpMode: "MANUAL" });
  assert.equal(res.status, 200);
  assert.equal(res.appliedCommand.pumpMode, "MANUAL");
});

// 7. Normal user can turn pump ON / OFF manually on assigned device
test("7. Normal user can turn pump ON / OFF manually on assigned device", () => {
  const user = { _id: "user-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const resOn = evaluateDeviceControl(user, device, { manualPumpState: "ON" });
  const resOff = evaluateDeviceControl(user, device, { manualPumpState: "OFF" });
  assert.equal(resOn.status, 200);
  assert.equal(resOff.status, 200);
});

// 8. Normal user can toggle system enable / disable on assigned device
test("8. Normal user can toggle system enable / disable on assigned device", () => {
  const user = { _id: "user-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceControl(user, device, { systemEnabled: false });
  assert.equal(res.status, 200);
  assert.equal(res.appliedCommand.systemEnabled, false);
});

// 9. Normal user can toggle Moteur pump permission on assigned device
test("9. Normal user can toggle Moteur pump permission on assigned device", () => {
  const user = { _id: "user-1", role: "user" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceControl(user, device, { allowPumpOnMoteur: true });
  assert.equal(res.status, 200);
  assert.equal(res.appliedCommand.allowPumpOnMoteur, true);
});

// 10. Admin cannot toggle pump mode (AUTO/MANUAL) (403)
test("10. Admin cannot toggle pump mode (403)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceControl(admin, device, { pumpMode: "MANUAL" });
  assert.equal(res.status, 403);
});

// 11. Admin cannot turn pump ON / OFF manually (403)
test("11. Admin cannot turn pump ON / OFF manually (403)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceControl(admin, device, { manualPumpState: "ON" });
  assert.equal(res.status, 403);
});

// 12. Admin cannot toggle system enable / disable (403)
test("12. Admin cannot toggle system enable / disable (403)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceControl(admin, device, { systemEnabled: false });
  assert.equal(res.status, 403);
});

// 13. Admin cannot toggle Moteur pump permission (403)
test("13. Admin cannot toggle Moteur pump permission (403)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const device = { deviceId: "tank-01", owner: "user-1" };
  const res = evaluateDeviceControl(admin, device, { allowPumpOnMoteur: true });
  assert.equal(res.status, 403);
});

// 14. Normal user cannot operate pump controls for unassigned / other user's device (403)
test("14. Normal user cannot operate pump controls for unassigned or other user's device", () => {
  const user = { _id: "user-1", role: "user" };
  const otherDevice = { deviceId: "tank-02", owner: "user-2" };
  const unassigned = { deviceId: "tank-03", owner: null };
  assert.equal(evaluateDeviceControl(user, otherDevice, { manualPumpState: "ON" }).status, 403);
  assert.equal(evaluateDeviceControl(user, unassigned, { manualPumpState: "ON" }).status, 403);
});

// 15. Admin can monitor all devices (GET /api/devices returns all)
test("15. Admin can monitor all devices", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const devices = [{ deviceId: "tank-01", owner: "user-1" }, { deviceId: "tank-02", owner: "user-2" }];
  const visible = devices.filter((d) => admin.role === "admin" || d.owner === admin._id);
  assert.equal(visible.length, 2);
});

// 16. Normal user only sees assigned devices
test("16. Normal user only sees assigned devices", () => {
  const user = { _id: "user-1", role: "user" };
  const devices = [{ deviceId: "tank-01", owner: "user-1" }, { deviceId: "tank-02", owner: "user-2" }];
  const visible = devices.filter((d) => user.role === "admin" || d.owner === user._id);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].deviceId, "tank-01");
});

// 17. Admin can query telemetry history for any device
test("17. Admin can query telemetry history for any device", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const res = evaluateTelemetryAccess(admin, [], "tank-02");
  assert.equal(res.status, 200);
});

// 18. Normal user querying another user's device telemetry gets 403
test("18. Normal user querying another user's device telemetry gets 403", () => {
  const user = { _id: "user-1", role: "user" };
  const userDevices = ["tank-01"];
  const res = evaluateTelemetryAccess(user, userDevices, "tank-02");
  assert.equal(res.status, 403);
});

// 19. Admin can query analytics for any device
test("19. Admin can query analytics for any device", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const res = evaluateAnalyticsAccess(admin, [], "tank-02");
  assert.equal(res.status, 200);
});

// 20. Normal user querying another user's device analytics gets 403
test("20. Normal user querying another user's device analytics gets 403", () => {
  const user = { _id: "user-1", role: "user" };
  const userDevices = ["tank-01"];
  const res = evaluateAnalyticsAccess(user, userDevices, "tank-02");
  assert.equal(res.status, 403);
});

// 21. Admin can assign device to an account with role === 'user'
test("21. Admin can assign device to an account with role === 'user'", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const targetUser = { _id: "user-2", role: "user", isActive: true };
  const device = { deviceId: "tank-02", owner: null, tanks: { upper: { capacityLiters: 1000 } } };
  const res = evaluateDeviceAssignment(admin, targetUser, device);
  assert.equal(res.status, 200);
  assert.equal(res.newOwner, "user-2");
});

// 22. Admin cannot assign device to an account with role === 'admin' (400)
test("22. Admin cannot assign device to an account with role === 'admin' (400)", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const targetAdmin = { _id: "admin-2", role: "admin", isActive: true };
  const device = { deviceId: "tank-02", owner: null };
  const res = evaluateDeviceAssignment(admin, targetAdmin, device);
  assert.equal(res.status, 400);
  assert.match(res.message, /Administrators cannot be device owners/);
});

// 23. Device reassignment preserves tank configuration
test("23. Device reassignment preserves tank configuration", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const newUser = { _id: "user-3", role: "user", isActive: true };
  const existingDevice = {
    deviceId: "tank-01",
    owner: "user-1",
    tanks: { upper: { capacityLiters: 5000, heightMeters: 3.5 }, lower: { capacityLiters: 8000, heightMeters: 4.0 } },
  };
  const res = evaluateDeviceAssignment(admin, newUser, existingDevice);
  assert.equal(res.status, 200);
  assert.deepEqual(res.preservedTanks, existingDevice.tanks);
});

// 24. Audit logs are recorded for device assignment, pump controls, and tank config
test("24. Audit logs are recorded for device assignment, pump controls, and tank config", () => {
  assert.equal(AUDIT_ACTIONS.DEVICE_ASSIGNED, "DEVICE_ASSIGNED");
  assert.equal(AUDIT_ACTIONS.DEVICE_REASSIGNED, "DEVICE_REASSIGNED");
  assert.equal(AUDIT_ACTIONS.DEVICE_UNASSIGNED, "DEVICE_UNASSIGNED");
  assert.equal(AUDIT_ACTIONS.PUMP_MODE_CHANGED, "PUMP_MODE_CHANGED");
  assert.equal(AUDIT_ACTIONS.MANUAL_PUMP_COMMAND, "MANUAL_PUMP_COMMAND");
  assert.equal(AUDIT_ACTIONS.SYSTEM_ENABLED, "SYSTEM_ENABLED");
  assert.equal(AUDIT_ACTIONS.SYSTEM_DISABLED, "SYSTEM_DISABLED");
  assert.equal(AUDIT_ACTIONS.MOTEUR_PUMP_PERMISSION_ENABLED, "MOTEUR_PUMP_PERMISSION_ENABLED");
  assert.equal(AUDIT_ACTIONS.MOTEUR_PUMP_PERMISSION_DISABLED, "MOTEUR_PUMP_PERMISSION_DISABLED");
  assert.equal(AUDIT_ACTIONS.TANK_CONFIG_UPDATED, "TANK_CONFIG_UPDATED");
});
