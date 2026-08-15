import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { normalizePowerSource } from "../services/ultrasonicReadingService.js";
import {
  getDeviceControlState,
  setDeviceControlState,
} from "../services/deviceControlService.js";
import { ultrasonicReadingSchema } from "../routes/sensorRoutes.js";

/**
 * Unit tests for Dawle / Moteur electricity source logic, normalization,
 * fail-safe defaults, and transition handlers.
 */

test("normalizePowerSource converts valid input and safely falls back to MOTEUR", () => {
  // Direct matching
  assert.equal(normalizePowerSource("DAWLE"), "DAWLE");
  assert.equal(normalizePowerSource("MOTEUR"), "MOTEUR");

  // Case-insensitivity
  assert.equal(normalizePowerSource("dawle"), "DAWLE");
  assert.equal(normalizePowerSource("moteur"), "MOTEUR");
  assert.equal(normalizePowerSource(" Dawle "), "DAWLE");

  // Fail-safe defaults: any missing, null, or invalid input MUST yield MOTEUR
  assert.equal(normalizePowerSource(null), "MOTEUR");
  assert.equal(normalizePowerSource(undefined), "MOTEUR");
  assert.equal(normalizePowerSource(""), "MOTEUR");
  assert.equal(normalizePowerSource("SOLAR"), "MOTEUR");
  assert.equal(normalizePowerSource("GRID"), "MOTEUR");
  assert.equal(normalizePowerSource(123), "MOTEUR");
  assert.equal(normalizePowerSource({}), "MOTEUR");
});

test("ultrasonicReadingSchema validates powerSource and allowPumpOnMoteur fields", () => {
  const validBasePayload = {
    deviceId: "ESP32_WATER_CTRL_01",
    upperTank: { distanceCm: 45.5, percentage: 70, waterHeightCm: 104.5, tankStatus: "Normal" },
    lowerTank: { distanceCm: 30.2, percentage: 80, waterHeightCm: 119.8, tankStatus: "Normal" },
    pumpStatus: "OFF",
    systemEnabled: true,
    pumpMode: "AUTO",
    waterFlowDetected: false,
  };

  // Valid DAWLE
  const dawleResult = ultrasonicReadingSchema.parse({
    ...validBasePayload,
    powerSource: "DAWLE",
    allowPumpOnMoteur: false,
  });
  assert.equal(dawleResult.powerSource, "DAWLE");
  assert.equal(dawleResult.allowPumpOnMoteur, false);

  // Valid MOTEUR with permission
  const moteurResult = ultrasonicReadingSchema.parse({
    ...validBasePayload,
    powerSource: "MOTEUR",
    allowPumpOnMoteur: true,
  });
  assert.equal(moteurResult.powerSource, "MOTEUR");
  assert.equal(moteurResult.allowPumpOnMoteur, true);

  // Missing fields are optional
  const minimalResult = ultrasonicReadingSchema.parse(validBasePayload);
  assert.equal(minimalResult.powerSource, undefined);
  assert.equal(minimalResult.allowPumpOnMoteur, undefined);

  // Invalid enum values are rejected
  assert.throws(() =>
    ultrasonicReadingSchema.parse({
      ...validBasePayload,
      powerSource: "INVALID_SOURCE",
    })
  );
});

test("deviceControlService tracks and updates allowPumpOnMoteur", () => {
  // Update state with allowPumpOnMoteur = true
  const result1 = setDeviceControlState({ allowPumpOnMoteur: true });
  assert.equal(result1.state.allowPumpOnMoteur, true);

  const current1 = getDeviceControlState();
  assert.equal(current1.allowPumpOnMoteur, true);

  // Update state with allowPumpOnMoteur = false
  const result2 = setDeviceControlState({ allowPumpOnMoteur: false });
  assert.equal(result2.state.allowPumpOnMoteur, false);

  const current2 = getDeviceControlState();
  assert.equal(current2.allowPumpOnMoteur, false);
});

test("disabling system automatically resets allowPumpOnMoteur to false", () => {
  setDeviceControlState({ systemEnabled: true, allowPumpOnMoteur: true });
  assert.equal(getDeviceControlState().allowPumpOnMoteur, true);

  // When system is disabled, pump and permissions are shut down
  setDeviceControlState({ systemEnabled: false });
  assert.equal(getDeviceControlState().allowPumpOnMoteur, false);
});
