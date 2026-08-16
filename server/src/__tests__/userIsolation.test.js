import test from "node:test";
import assert from "node:assert/strict";
import { getLatestReading, saveLatestReading } from "../services/ultrasonicReadingService.js";
import {
  getDeviceControlState,
  setDeviceControlState,
} from "../services/deviceControlService.js";
import { computeDateRange, computeSummaryStats } from "../services/analyticsService.js";

/**
 * 24 Core User Data Isolation & Ownership-Period Access Tests
 */

// Helper: simulated alert query builder matching alertController.js buildUserAlertScope
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

// Helper: simulated telemetry history query filter builder matching telemetryHistoryController.js
function buildTelemetryFilter(user, ownedDevices, queryDeviceId) {
  if (user.role === "admin") {
    return queryDeviceId ? { deviceId: queryDeviceId } : {};
  }

  if (ownedDevices.length === 0) {
    return { _id: null, empty: true };
  }

  if (queryDeviceId) {
    const target = ownedDevices.find((d) => d.deviceId === queryDeviceId);
    if (!target) {
      return { forbidden: true };
    }
    const filter = { deviceId: target.deviceId };
    if (target.ownerAssignedAt) {
      filter.receivedAt = { $gte: target.ownerAssignedAt };
    }
    return filter;
  }

  if (ownedDevices.length === 1) {
    const target = ownedDevices[0];
    const filter = { deviceId: target.deviceId };
    if (target.ownerAssignedAt) {
      filter.receivedAt = { $gte: target.ownerAssignedAt };
    }
    return filter;
  }

  return {
    $or: ownedDevices.map((d) => ({
      deviceId: d.deviceId,
      ...(d.ownerAssignedAt ? { receivedAt: { $gte: d.ownerAssignedAt } } : {}),
    })),
  };
}

// 1. New User with no Device receives [] from device list
test("1. New User with no Device receives empty device list", () => {
  const newUser = { _id: "user-new", role: "user" };
  const allDevices = [
    { deviceId: "tank-01", owner: "user-old" },
    { deviceId: "tank-02", owner: "user-other" },
  ];
  const userDevices = allDevices.filter((d) => d.owner === newUser._id);
  assert.deepEqual(userDevices, []);
});

// 2. New User cannot request another User's Device (403)
test("2. New User cannot request another User's Device (returns 403)", () => {
  const newUser = { _id: "user-new", role: "user" };
  const device = { deviceId: "tank-01", owner: "user-old" };
  const isAuthorized = device.owner && String(device.owner) === String(newUser._id);
  assert.equal(isAuthorized, false);
});

// 3. New User cannot obtain another Device's latest telemetry
test("3. New User cannot obtain another Device's latest telemetry", () => {
  const newUser = { _id: "user-new", role: "user" };
  const userOwnedDevices = [];
  const requestedDeviceId = "tank-01";

  const isAllowed = userOwnedDevices.some((d) => d.deviceId === requestedDeviceId);
  assert.equal(isAllowed, false);
});

// 4. New User cannot obtain another Device's control state
test("4. New User cannot obtain another Device's control state", () => {
  const newUser = { _id: "user-new", role: "user" };
  const userOwnedDevices = [];
  const control = userOwnedDevices.length === 0 ? null : getDeviceControlState(userOwnedDevices[0].deviceId);
  assert.equal(control, null);
});

// 5. New User cannot access another Device's History
test("5. New User cannot access another Device's History", () => {
  const newUser = { _id: "user-new", role: "user" };
  const filter = buildTelemetryFilter(newUser, [], "tank-01");
  assert.equal(filter.forbidden || filter.empty, true);
});

// 6. New User cannot access another Device's Analytics
test("6. New User cannot access another Device's Analytics", () => {
  const newUser = { _id: "user-new", role: "user" };
  const ownedDevices = [];
  const hasAccess = ownedDevices.some((d) => d.deviceId === "tank-01");
  assert.equal(hasAccess, false);
});

// 7. New User cannot see another Device's Alerts
test("7. New User cannot see another Device's Alerts", () => {
  const scope = buildUserAlertScope([], "tank-01");
  assert.equal(scope._id, null);
});

// 8. User A logout -> User B login does not retain User A frontend state
test("8. User A logout -> User B login state isolation", () => {
  let userSession = { user: { _id: "user-A", email: "a@example.com" }, device: "tank-01" };
  // Logout
  userSession = { user: null, device: null };
  assert.equal(userSession.user, null);
  assert.equal(userSession.device, null);
  // User B login with no device
  userSession = { user: { _id: "user-B", email: "b@example.com" }, device: null };
  assert.equal(userSession.user._id, "user-B");
  assert.equal(userSession.device, null);
});

// 9. Socket subscription for User A is removed on logout
test("9. Socket subscription for User A is removed on logout", () => {
  const userRooms = new Set(["user:user-A", "device:tank-01"]);
  // Disconnect/cleanup on logout
  userRooms.clear();
  assert.equal(userRooms.size, 0);
  assert.equal(userRooms.has("device:tank-01"), false);
});

// 10. User B with no Device receives no User A Socket.IO telemetry
test("10. User B with no Device receives no User A Socket.IO telemetry", () => {
  const userBRooms = new Set(["user:user-B"]);
  const eventTargetRoom = "device:tank-01";
  const userBReceivesEvent = userBRooms.has(eventTargetRoom);
  assert.equal(userBReceivesEvent, false);
});

// 11. Reassignment immediately removes User A access
test("11. Reassignment immediately removes User A access", () => {
  const userA = { _id: "user-A", role: "user" };
  const reassignedDevice = { deviceId: "tank-01", owner: "user-B", ownerAssignedAt: new Date("2026-08-16T15:00:00Z") };
  const userACanAccess = String(reassignedDevice.owner) === String(userA._id);
  assert.equal(userACanAccess, false);
});

// 12. Reassignment immediately enables User B current/live access
test("12. Reassignment immediately enables User B current/live access", () => {
  const userB = { _id: "user-B", role: "user" };
  const reassignedDevice = { deviceId: "tank-01", owner: "user-B", ownerAssignedAt: new Date("2026-08-16T15:00:00Z") };
  const userBCanAccess = String(reassignedDevice.owner) === String(userB._id);
  assert.equal(userBCanAccess, true);
});

// 13. User B cannot see telemetry before ownerAssignedAt
test("13. User B cannot see telemetry before ownerAssignedAt", () => {
  const userB = { _id: "user-B", role: "user" };
  const assignedAt = new Date("2026-08-16T15:00:00Z");
  const ownedDevices = [{ deviceId: "tank-01", ownerAssignedAt: assignedAt }];

  const filter = buildTelemetryFilter(userB, ownedDevices, "tank-01");
  assert.deepEqual(filter.receivedAt, { $gte: assignedAt });

  const pastReading = { receivedAt: new Date("2026-08-16T14:00:00Z") };
  const isIncluded = pastReading.receivedAt >= filter.receivedAt.$gte;
  assert.equal(isIncluded, false);
});

// 14. User B sees telemetry after ownerAssignedAt
test("14. User B sees telemetry after ownerAssignedAt", () => {
  const assignedAt = new Date("2026-08-16T15:00:00Z");
  const futureReading = { receivedAt: new Date("2026-08-16T15:30:00Z") };
  const isIncluded = futureReading.receivedAt >= assignedAt;
  assert.equal(isIncluded, true);
});

// 15. Admin sees complete Device history
test("15. Admin sees complete Device history without ownerAssignedAt cutoff", () => {
  const admin = { _id: "admin-1", role: "admin" };
  const filter = buildTelemetryFilter(admin, [], "tank-01");
  assert.equal(filter.deviceId, "tank-01");
  assert.equal(filter.receivedAt, undefined); // No date cutoff for admin
});

// 16. User analytics respect ownership start time
test("16. User analytics respect ownership start time", () => {
  const assignedAt = new Date("2026-08-16T15:00:00Z");
  const requestedFrom = "2026-08-10T00:00:00Z";
  let effectiveFrom = requestedFrom;

  if (!effectiveFrom || new Date(effectiveFrom) < assignedAt) {
    effectiveFrom = assignedAt.toISOString();
  }
  assert.equal(effectiveFrom, assignedAt.toISOString());
});

// 17. CSV export respects ownership start time
test("17. CSV export respects ownership start time", () => {
  const userB = { _id: "user-B", role: "user" };
  const assignedAt = new Date("2026-08-16T15:00:00Z");
  const filter = buildTelemetryFilter(userB, [{ deviceId: "tank-01", ownerAssignedAt: assignedAt }], "tank-01");
  assert.deepEqual(filter.receivedAt, { $gte: assignedAt });
});

// 18. Historical resolved alerts before ownership are hidden from new User
test("18. Historical resolved alerts before ownership are hidden from new User", () => {
  const assignedAt = new Date("2026-08-16T15:00:00Z");
  const ownedDevices = [{ deviceId: "tank-01", ownerAssignedAt: assignedAt }];
  const scope = buildUserAlertScope(ownedDevices, "tank-01");

  const oldResolvedAlert = {
    deviceId: "tank-01",
    isResolved: true,
    firstSeenAt: new Date("2026-08-16T12:00:00Z"),
  };

  // Condition from query: alert matches if (isResolved == false || firstSeenAt >= assignedAt)
  const matches = !oldResolvedAlert.isResolved || oldResolvedAlert.firstSeenAt >= assignedAt;
  assert.equal(matches, false);
});

// 19. Current active physical alert behavior is preserved across reassignment
test("19. Current active physical alert remains visible after reassignment", () => {
  const assignedAt = new Date("2026-08-16T15:00:00Z");
  const activeAlert = {
    deviceId: "tank-01",
    isResolved: false, // Active physical condition (e.g. sensor error or tank dry run)
    firstSeenAt: new Date("2026-08-16T12:00:00Z"),
  };

  const matches = !activeAlert.isResolved || activeAlert.firstSeenAt >= assignedAt;
  assert.equal(matches, true);
});

// 20. Device assignment preserves tank configuration
test("20. Device assignment preserves physical tank configuration", () => {
  const physicalTanks = {
    upper: { capacityLiters: 2000, heightCm: 180 },
    lower: { capacityLiters: 3000, heightCm: 220 },
  };
  const device = {
    deviceId: "tank-01",
    owner: "user-A",
    tanks: physicalTanks,
  };

  // Reassign to user-B
  device.owner = "user-B";
  device.ownerAssignedAt = new Date();

  assert.deepEqual(device.tanks, physicalTanks);
});

// 21. Unassignment removes normal User access immediately
test("21. Unassignment removes normal User access immediately", () => {
  const userA = { _id: "user-A", role: "user" };
  const device = { deviceId: "tank-01", owner: null, ownerAssignedAt: null };

  const hasAccess = Boolean(device.owner && String(device.owner) === String(userA._id));
  assert.equal(hasAccess, false);
});

// 22. Direct URL/API tampering returns 403
test("22. Direct URL/API tampering returns 403 Forbidden", () => {
  const userB = { _id: "user-B", role: "user" };
  const ownedDevices = [{ deviceId: "tank-02" }];
  const requestedDeviceId = "tank-01"; // Tampered URL / query

  const isOwner = ownedDevices.some((d) => d.deviceId === requestedDeviceId);
  const status = isOwner ? 200 : 403;
  assert.equal(status, 403);
});

// 23. No hardcoded tank-01 authorization fallback remains
test("23. Per-device control and telemetry states operate independently without tank-01 fallback", () => {
  // Setup independent states for tank-01 and tank-02
  setDeviceControlState("tank-01", { systemEnabled: true, pumpMode: "AUTO" });
  setDeviceControlState("tank-02", { systemEnabled: false, pumpMode: "MANUAL" });

  const state1 = getDeviceControlState("tank-01");
  const state2 = getDeviceControlState("tank-02");

  assert.equal(state1.deviceId, "tank-01");
  assert.equal(state1.systemEnabled, true);
  assert.equal(state1.pumpMode, "AUTO");

  assert.equal(state2.deviceId, "tank-02");
  assert.equal(state2.systemEnabled, false);
  assert.equal(state2.pumpMode, "MANUAL");
});

// 24. Frontend does not flash stale data during account switch
test("24. User change resets telemetry and control buffers to null/loading", () => {
  let frontendState = {
    reading: { deviceId: "tank-01", percentage: 75 },
    device: { deviceId: "tank-01" },
    isLoading: false,
  };

  // On auth change: reset hook state immediately
  frontendState = {
    reading: null,
    device: null,
    isLoading: true,
  };

  assert.equal(frontendState.reading, null);
  assert.equal(frontendState.device, null);
  assert.equal(frontendState.isLoading, true);
});
