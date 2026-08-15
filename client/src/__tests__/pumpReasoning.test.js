import test from "node:test";
import assert from "node:assert/strict";
import {
  canCommandManualOn,
  derivePumpReasoning,
  deriveSafetyChecks,
} from "../utils/pumpReasoning.js";

/**
 * These tests pin the safety precedence the UI presents.
 *
 * The firmware is what actually controls the relay; this module only explains
 * and gates the buttons. Getting the precedence wrong would mean showing an
 * operator a reassuring reason while a fault is active, or offering a manual
 * start the hardware would refuse.
 */

function reading(overrides = {}) {
  return {
    upperTank: { percentage: 50, tankStatus: "Normal" },
    lowerTank: { percentage: 60, tankStatus: "Normal" },
    pumpStatus: "OFF",
    powerSource: "DAWLE",
    ...overrides,
  };
}

const enabledAuto = { systemEnabled: true, pumpMode: "AUTO" };

test("offline outranks every other explanation", () => {
  const result = derivePumpReasoning({
    reading: reading({ lowerTank: { percentage: 2, tankStatus: "Empty" } }),
    controlState: { systemEnabled: false, pumpMode: "MANUAL" },
    isOnline: false,
  });

  assert.equal(result.key, "reasonOffline");
  assert.equal(result.blocked, true);
});

test("a sensor error outranks a disabled system", () => {
  const result = derivePumpReasoning({
    reading: reading({ upperTank: { percentage: 50, tankStatus: "Sensor Error" } }),
    controlState: { systemEnabled: false, pumpMode: "AUTO" },
    isOnline: true,
  });

  assert.equal(result.key, "reasonSensorError");
  assert.equal(result.blocked, true);
});

test("dry-run protection outranks a disabled system", () => {
  const result = derivePumpReasoning({
    reading: reading({ lowerTank: { percentage: 8, tankStatus: "Low" } }),
    controlState: { systemEnabled: false, pumpMode: "AUTO" },
    isOnline: true,
  });

  assert.equal(result.key, "reasonDryRun");
  assert.equal(result.blocked, true);
});

test("a missing level is explained as invalid telemetry, never as a normal state", () => {
  const result = derivePumpReasoning({
    reading: reading({ lowerTank: null }),
    controlState: enabledAuto,
    isOnline: true,
  });

  assert.equal(result.key, "reasonInvalidTelemetry");
  assert.equal(result.blocked, true);
});

test("no reading at all is explained rather than treated as nominal", () => {
  const result = derivePumpReasoning({
    reading: null,
    controlState: enabledAuto,
    isOnline: true,
  });

  assert.equal(result.key, "reasonNoTelemetry");
  assert.equal(result.blocked, true);
});

test("a normal AUTO idle state reports the start threshold", () => {
  const result = derivePumpReasoning({
    reading: reading(),
    controlState: enabledAuto,
    isOnline: true,
  });

  assert.equal(result.key, "reasonAutoIdle");
  assert.equal(result.blocked, false);
});

test("manual ON is refused whenever the lower tank is at the dry-run limit", () => {
  const result = canCommandManualOn({
    reading: reading({ lowerTank: { percentage: 10, tankStatus: "Low" } }),
    controlState: { systemEnabled: true, pumpMode: "MANUAL" },
    isOnline: true,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reasonKey, "blockDryRun");
});

test("manual ON is refused when the upper tank is already at the stop level", () => {
  const result = canCommandManualOn({
    reading: reading({ upperTank: { percentage: 90, tankStatus: "Full" } }),
    controlState: { systemEnabled: true, pumpMode: "MANUAL" },
    isOnline: true,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reasonKey, "blockUpperFull");
});

test("manual ON is refused while the device is offline", () => {
  const result = canCommandManualOn({
    reading: reading(),
    controlState: { systemEnabled: true, pumpMode: "MANUAL" },
    isOnline: false,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reasonKey, "blockOffline");
});

test("manual ON is allowed when every interlock is satisfied", () => {
  // Manual mode legitimately bypasses the AUTO *start* condition: the upper
  // tank here is well above the 20% level that would trigger an auto start.
  const result = canCommandManualOn({
    reading: reading({ upperTank: { percentage: 60, tankStatus: "Normal" } }),
    controlState: { systemEnabled: true, pumpMode: "MANUAL" },
    isOnline: true,
  });

  assert.equal(result.allowed, true);
});

test("an interlock with no data reports unknown, never pass", () => {
  const checks = deriveSafetyChecks({
    reading: reading({ lowerTank: null }),
    controlState: {},
    isOnline: true,
  });

  const lowerCheck = checks.find((check) => check.id === "lowerLevel");
  const systemCheck = checks.find((check) => check.id === "systemEnabled");

  assert.equal(lowerCheck.state, "unknown");
  assert.equal(systemCheck.state, "unknown");
});

test("interlocks report pass and fail correctly on real values", () => {
  const checks = deriveSafetyChecks({
    reading: reading({
      lowerTank: { percentage: 5, tankStatus: "Low" },
      upperTank: { percentage: 50, tankStatus: "Normal" },
    }),
    controlState: { systemEnabled: true },
    isOnline: true,
  });

  assert.equal(checks.find((check) => check.id === "lowerLevel").state, "fail");
  assert.equal(checks.find((check) => check.id === "upperHeadroom").state, "pass");
  assert.equal(checks.find((check) => check.id === "deviceOnline").state, "pass");
  assert.equal(checks.find((check) => check.id === "systemEnabled").state, "pass");
});

test("DAWLE power source permits normal AUTO pump logic", () => {
  const result = derivePumpReasoning({
    reading: reading({ powerSource: "DAWLE" }),
    controlState: enabledAuto,
    isOnline: true,
  });

  assert.equal(result.key, "reasonAutoIdle");
  assert.equal(result.blocked, false);
});

test("MOTEUR power source without permission blocks pump reasoning", () => {
  const result = derivePumpReasoning({
    reading: reading({ powerSource: "MOTEUR", allowPumpOnMoteur: false }),
    controlState: { ...enabledAuto, allowPumpOnMoteur: false },
    isOnline: true,
  });

  assert.equal(result.key, "reasonMoteurBlocked");
  assert.equal(result.blocked, true);
  assert.equal(result.tone, "warning");
});

test("MOTEUR power source with explicit permission allows normal pump reasoning", () => {
  const result = derivePumpReasoning({
    reading: reading({ powerSource: "MOTEUR", allowPumpOnMoteur: true }),
    controlState: { ...enabledAuto, allowPumpOnMoteur: true },
    isOnline: true,
  });

  assert.equal(result.key, "reasonAutoIdle");
  assert.equal(result.blocked, false);
});

test("MOTEUR blocks manual ON when allowPumpOnMoteur is false", () => {
  const result = canCommandManualOn({
    reading: reading({ powerSource: "MOTEUR", allowPumpOnMoteur: false }),
    controlState: { systemEnabled: true, pumpMode: "MANUAL", allowPumpOnMoteur: false },
    isOnline: true,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reasonKey, "blockMoteurNoPermission");
});

test("MOTEUR allows manual ON when allowPumpOnMoteur is true and all other checks pass", () => {
  const result = canCommandManualOn({
    reading: reading({ powerSource: "MOTEUR", allowPumpOnMoteur: true }),
    controlState: { systemEnabled: true, pumpMode: "MANUAL", allowPumpOnMoteur: true },
    isOnline: true,
  });

  assert.equal(result.allowed, true);
});

test("dry-run outranks MOTEUR permission in reasoning", () => {
  const result = derivePumpReasoning({
    reading: reading({
      lowerTank: { percentage: 5, tankStatus: "Low" },
      powerSource: "MOTEUR",
      allowPumpOnMoteur: true,
    }),
    controlState: { ...enabledAuto, allowPumpOnMoteur: true },
    isOnline: true,
  });

  assert.equal(result.key, "reasonDryRun");
  assert.equal(result.blocked, true);
});

test("powerSource safety check correctly evaluates DAWLE, MOTEUR permitted, and MOTEUR blocked", () => {
  const checksDawle = deriveSafetyChecks({
    reading: reading({ powerSource: "DAWLE" }),
    controlState: enabledAuto,
    isOnline: true,
  });
  assert.equal(checksDawle.find((c) => c.id === "powerSource").state, "pass");

  const checksMoteurBlocked = deriveSafetyChecks({
    reading: reading({ powerSource: "MOTEUR", allowPumpOnMoteur: false }),
    controlState: { ...enabledAuto, allowPumpOnMoteur: false },
    isOnline: true,
  });
  assert.equal(checksMoteurBlocked.find((c) => c.id === "powerSource").state, "fail");

  const checksMoteurAllowed = deriveSafetyChecks({
    reading: reading({ powerSource: "MOTEUR", allowPumpOnMoteur: true }),
    controlState: { ...enabledAuto, allowPumpOnMoteur: true },
    isOnline: true,
  });
  assert.equal(checksMoteurAllowed.find((c) => c.id === "powerSource").state, "pass");
});

