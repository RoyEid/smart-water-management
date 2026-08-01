import test from "node:test";
import assert from "node:assert/strict";
import { deriveConditions } from "../services/alertService.js";
import { ALERT_CODES } from "../models/Alert.js";

/**
 * deriveConditions is the pure half of the alerting pipeline: it decides which
 * conditions are true for a reading, with no database or socket involved. These
 * tests pin the safety-relevant decisions so a later refactor cannot quietly
 * stop raising an alert for a real fault.
 */

function reading(overrides = {}) {
  return {
    deviceId: "tank-01",
    upperTank: { percentage: 50, distanceCm: 12, waterHeightCm: 10, tankStatus: "Normal" },
    lowerTank: { percentage: 60, distanceCm: 10, waterHeightCm: 12, tankStatus: "Normal" },
    pumpStatus: "OFF",
    systemEnabled: true,
    pumpMode: "AUTO",
    receivedAt: new Date().toISOString(),
    ...overrides,
  };
}

function codes(conditions) {
  return conditions.map((condition) => condition.code);
}

test("a healthy reading raises no conditions", () => {
  const conditions = deriveConditions(reading(), { isOnline: true });
  assert.deepEqual(codes(conditions), []);
});

test("an offline device raises exactly one condition and suppresses level-based ones", () => {
  // The tank values below would each trigger an alert on their own. Once the
  // device is offline they describe a past state, so re-raising them would be
  // asserting something that is no longer known to be true.
  const conditions = deriveConditions(
    reading({
      lowerTank: { percentage: 2, distanceCm: 24, waterHeightCm: 1, tankStatus: "Empty" },
      upperTank: { percentage: 95, distanceCm: 4, waterHeightCm: 21, tankStatus: "Full" },
    }),
    { isOnline: false }
  );

  assert.deepEqual(codes(conditions), [ALERT_CODES.DEVICE_OFFLINE]);
  assert.equal(conditions[0].severity, "critical");
});

test("the lower tank at the dry-run limit raises both the critical level and the pump block", () => {
  const conditions = deriveConditions(
    reading({
      lowerTank: { percentage: 10, distanceCm: 23, waterHeightCm: 2, tankStatus: "Low" },
    }),
    { isOnline: true }
  );

  assert.ok(codes(conditions).includes(ALERT_CODES.LOWER_TANK_CRITICAL));
  assert.ok(codes(conditions).includes(ALERT_CODES.PUMP_BLOCKED));
});

test("the dry-run threshold is inclusive at exactly 10 percent", () => {
  const atLimit = deriveConditions(
    reading({ lowerTank: { percentage: 10, distanceCm: 23, waterHeightCm: 2, tankStatus: "Low" } }),
    { isOnline: true }
  );
  const justAbove = deriveConditions(
    reading({ lowerTank: { percentage: 10.1, distanceCm: 23, waterHeightCm: 2, tankStatus: "Low" } }),
    { isOnline: true }
  );

  assert.ok(codes(atLimit).includes(ALERT_CODES.LOWER_TANK_CRITICAL));
  assert.ok(!codes(justAbove).includes(ALERT_CODES.LOWER_TANK_CRITICAL));
});

test("the upper tank full threshold is inclusive at exactly 90 percent", () => {
  const atLimit = deriveConditions(
    reading({ upperTank: { percentage: 90, distanceCm: 5, waterHeightCm: 20, tankStatus: "Full" } }),
    { isOnline: true }
  );
  const justBelow = deriveConditions(
    reading({ upperTank: { percentage: 89.9, distanceCm: 5, waterHeightCm: 20, tankStatus: "High" } }),
    { isOnline: true }
  );

  assert.ok(codes(atLimit).includes(ALERT_CODES.UPPER_TANK_FULL));
  assert.ok(!codes(justBelow).includes(ALERT_CODES.UPPER_TANK_FULL));
});

test("a sensor error on either tank raises the matching condition", () => {
  const upper = deriveConditions(
    reading({
      upperTank: { percentage: 0, distanceCm: 0, waterHeightCm: 0, tankStatus: "Sensor Error" },
    }),
    { isOnline: true }
  );
  const lower = deriveConditions(
    reading({
      lowerTank: { percentage: 0, distanceCm: 0, waterHeightCm: 0, tankStatus: "Sensor Error" },
    }),
    { isOnline: true }
  );

  assert.ok(codes(upper).includes(ALERT_CODES.UPPER_SENSOR_ERROR));
  assert.ok(codes(lower).includes(ALERT_CODES.LOWER_SENSOR_ERROR));
});

test("a missing tank level is reported as invalid telemetry, not as an empty tank", () => {
  const conditions = deriveConditions(
    reading({ lowerTank: null }),
    { isOnline: true }
  );

  assert.ok(codes(conditions).includes(ALERT_CODES.INVALID_TELEMETRY));
  // Critically: absent data must not be read as 0% and reported as a dry tank.
  assert.ok(!codes(conditions).includes(ALERT_CODES.LOWER_TANK_CRITICAL));
});

test("a disabled system is reported", () => {
  const conditions = deriveConditions(reading({ systemEnabled: false }), { isOnline: true });
  assert.ok(codes(conditions).includes(ALERT_CODES.SYSTEM_DISABLED));
});

test("no reading yields no conditions rather than throwing", () => {
  assert.deepEqual(deriveConditions(null, { isOnline: true }), []);
});
