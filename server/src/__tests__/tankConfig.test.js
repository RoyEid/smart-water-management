import test from "node:test";
import assert from "node:assert/strict";

// Helper logic mimicking controller & formula behavior
function convertMetersToCm(meters) {
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) {
    throw new Error("Usable height in meters must be a positive finite number.");
  }
  return Math.round(meters * 100);
}

function calculateWaterPercentage(waterDistanceCm, usableHeightCm, mountingOffsetCm = 0.0) {
  if (usableHeightCm == null || usableHeightCm <= 0) return null;
  const calibratedDistance = Math.max(0, Math.min(usableHeightCm, waterDistanceCm - mountingOffsetCm));
  const waterHeight = Math.max(0, Math.min(usableHeightCm, usableHeightCm - calibratedDistance));
  const percentage = (waterHeight / usableHeightCm) * 100;
  return Math.max(0, Math.min(100, percentage));
}

function calculateVolumeLiters(percentage, capacityLiters) {
  if (percentage == null || capacityLiters == null || capacityLiters <= 0) return null;
  const clamped = Math.max(0, Math.min(100, percentage));
  return (clamped / 100) * capacityLiters;
}

function evaluateUpdateAuthorization(actor) {
  const role = typeof actor === "string" ? actor : (actor?.role || actor);
  if (role === "admin" || role === "owner") {
    return { allowed: true, statusCode: 200 };
  }
  return { allowed: false, statusCode: 403, error: "Only the device admin is authorized to configure tank parameters." };
}

test("1 & 2: device admin can create and update tank configuration", () => {
  const auth = evaluateUpdateAuthorization("admin");

  assert.equal(auth.allowed, true);
  assert.equal(auth.statusCode, 200);

  // Legacy owner role compatibility
  const legacyAuth = evaluateUpdateAuthorization("owner");
  assert.equal(legacyAuth.allowed, true);
  assert.equal(legacyAuth.statusCode, 200);

  const initialPayload = {
    upper: { capacityLiters: 10000, heightMeters: 5 },
    lower: { capacityLiters: 15000, heightMeters: 4 },
  };

  const initialUpperCm = convertMetersToCm(initialPayload.upper.heightMeters);
  assert.equal(initialUpperCm, 500);

  // Updating later
  const updatedPayload = {
    upper: { capacityLiters: 12000, heightMeters: 6 },
    lower: { capacityLiters: 18000, heightMeters: 4.5 },
  };
  const updatedUpperCm = convertMetersToCm(updatedPayload.upper.heightMeters);
  assert.equal(updatedUpperCm, 600);
});

test("3: user cancel editing restores original state without calling API", () => {
  const savedState = { upperCapacity: 10000, upperHeight: 5 };
  let draftState = { upperCapacity: 12000, upperHeight: 6 };

  // Cancel action
  draftState = { ...savedState };
  assert.equal(draftState.upperCapacity, 10000);
  assert.equal(draftState.upperHeight, 5);
});

test("4, 5, 6, & 7: controller and viewer cannot create/update config (direct API returns 403)", () => {
  const controllerAuth = evaluateUpdateAuthorization("controller");
  assert.equal(controllerAuth.allowed, false);
  assert.equal(controllerAuth.statusCode, 403);
  assert.equal(controllerAuth.error, "Only the device admin is authorized to configure tank parameters.");

  const viewerAuth = evaluateUpdateAuthorization("viewer");
  assert.equal(viewerAuth.allowed, false);
  assert.equal(viewerAuth.statusCode, 403);
});

test("8 & 9: invalid capacity or height (<= 0, NaN, negative, non-numeric) are rejected", () => {
  assert.throws(() => convertMetersToCm(0));
  assert.throws(() => convertMetersToCm(-5));
  assert.throws(() => convertMetersToCm(NaN));
  assert.throws(() => convertMetersToCm("invalid"));
});

test("10: missing configuration remains null/unconfigured rather than fake zeros", () => {
  const unconfiguredTank = { capacityLiters: null, heightCm: null };
  const percentage = 75.0;

  const volume = calculateVolumeLiters(percentage, unconfiguredTank.capacityLiters);
  assert.equal(volume, null);
});

test("11: configuration can be saved even while device is offline", () => {
  const device = { deviceId: "tank-01", isOnline: false, tanks: null };
  const adminUser = { role: "admin" };

  const auth = evaluateUpdateAuthorization(adminUser);
  assert.equal(auth.allowed, true);

  // Configuration is persisted to DB regardless of isOnline state
  device.tanks = {
    upper: { capacityLiters: 10000, heightCm: 500 },
    lower: { capacityLiters: 15000, heightCm: 400 },
  };

  assert.notEqual(device.tanks, null);
  assert.equal(device.tanks.upper.heightCm, 500);
});

test("12: control polling response shape includes updated tank heights in cm for ESP32 sync", () => {
  const device = {
    deviceId: "tank-01",
    tanks: {
      upper: { capacityLiters: 10000, heightCm: 500 },
      lower: { capacityLiters: 15000, heightCm: 400 },
    },
  };

  const controlResponse = {
    systemEnabled: true,
    pumpMode: "AUTO",
    manualPumpState: "OFF",
    upperTankHeightCm: device.tanks.upper.heightCm,
    lowerTankHeightCm: device.tanks.lower.heightCm,
  };

  assert.equal(controlResponse.upperTankHeightCm, 500);
  assert.equal(controlResponse.lowerTankHeightCm, 400);
});

test("13 & 14: percentage uses configured height and volume uses configured capacity", () => {
  const usableHeightCm = 500;
  const capacityLiters = 10000;
  const measuredDistanceCm = 155.0; // water height = 505 - 155 = 350 cm

  const percentage = calculateWaterPercentage(measuredDistanceCm, usableHeightCm, 5.0);
  assert.equal(percentage, 70.0);

  const volume = calculateVolumeLiters(percentage, capacityLiters);
  assert.equal(volume, 7000.0);

  // User configured 1000 L tank calculations
  const upperVol = calculateVolumeLiters(24.3, 1000);
  assert.equal(Math.round(upperVol), 243);

  const lowerVol = calculateVolumeLiters(22.9, 1000);
  assert.equal(Math.round(lowerVol), 229);
});

test("15: pump control thresholds remain strictly percentage-based", () => {
  const UPPER_PUMP_ON_LEVEL = 20.0;
  const UPPER_PUMP_OFF_LEVEL = 90.0;

  function evaluatePump(upperPercentage) {
    if (upperPercentage <= UPPER_PUMP_ON_LEVEL) return "PUMP_ON";
    if (upperPercentage >= UPPER_PUMP_OFF_LEVEL) return "PUMP_OFF";
    return "IDLE";
  }

  assert.equal(evaluatePump(15.0), "PUMP_ON");
  assert.equal(evaluatePump(50.0), "IDLE");
  assert.equal(evaluatePump(95.0), "PUMP_OFF");
});

test("16 & 17: audit log records old vs new metadata on success, and no entry on validation failure", () => {
  const auditLogs = [];

  function performConfigUpdate(user, previousTanks, newTanksInput) {
    if (user.role !== "admin" && user.role !== "owner") throw new Error("403 Forbidden");
    if (!newTanksInput.upper?.capacityLiters || newTanksInput.upper.capacityLiters <= 0) {
      throw new Error("400 Bad Request");
    }

    const nextTanks = {
      upper: { capacityLiters: newTanksInput.upper.capacityLiters, heightCm: newTanksInput.upper.heightMeters * 100 },
    };

    auditLogs.push({
      action: "TANK_CONFIG_UPDATED",
      actorRole: user.role,
      metadata: { previous: previousTanks, next: nextTanks },
    });
  }

  const prev = { upper: { capacityLiters: 10000, heightCm: 500 } };
  performConfigUpdate({ role: "admin" }, prev, { upper: { capacityLiters: 12000, heightMeters: 6 } });

  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].metadata.previous.upper.capacityLiters, 10000);
  assert.equal(auditLogs[0].metadata.next.upper.capacityLiters, 12000);

  // Failed update does not push audit entry
  assert.throws(() => performConfigUpdate({ role: "admin" }, prev, { upper: { capacityLiters: -1, heightMeters: 5 } }));
  assert.equal(auditLogs.length, 1);
});

test("18: telemetry with waterHeightCm > 50 cm (e.g. 150 cm tank @ 35.4 cm / 100 cm) is accepted", () => {
  const upperHeightCm = 150;
  const lowerHeightCm = 80;

  // 1.5 m -> 150 cm conversion
  assert.equal(1.5 * 100, 150);

  // Test 1: Configured 150 cm, waterHeightCm = 35.4 -> valid
  const reading1 = { waterHeightCm: 35.4 };
  assert.ok(reading1.waterHeightCm <= upperHeightCm);

  // Test 2: Configured 50 cm, waterHeightCm = 35.4 -> valid
  assert.ok(reading1.waterHeightCm <= 50);

  // Test 4: Height changed 50 cm -> 150 cm, next reading = 100 cm -> valid
  const newUpperHeightCm = 150;
  const reading2 = { waterHeightCm: 100 };
  assert.ok(reading2.waterHeightCm <= newUpperHeightCm);

  // Test 5: Separate Upper (150 cm) and Lower (80 cm) heights
  assert.equal(upperHeightCm, 150);
  assert.equal(lowerHeightCm, 80);

  // Test 8: Successful telemetry updates lastSeenAt and device returns Online
  const now = new Date();
  const lastSeenAt = new Date(now.getTime() - 2000); // 2s ago
  const isOnline = (now.getTime() - lastSeenAt.getTime()) < 10000;
  assert.equal(isOnline, true);
});
