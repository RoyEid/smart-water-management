import test from "node:test";
import assert from "node:assert/strict";
import {
  formatNumber,
  formatPercentage,
  formatVolume,
  hasValue,
  litresFromPercentage,
  TANK_CAPACITY_LITRES,
  tankStatusKey,
} from "../utils/telemetryFormat.js";

/**
 * The rule this module exists to enforce: a value that was not measured is
 * never rendered as a number. These tests are the guard on that rule.
 */

test("a missing value is reported as absent, not as zero", () => {
  for (const missing of [null, undefined, NaN, Infinity, "50", {}]) {
    assert.equal(hasValue(missing), false, `${String(missing)} should not count as a value`);
  }
});

test("zero is a real reading and survives formatting", () => {
  // The bug this prevents: treating 0 as falsy and showing a placeholder for a
  // genuinely empty tank, or the reverse — showing 0 for missing data.
  const percentage = formatPercentage(0);
  assert.equal(percentage.hasValue, true);
  assert.equal(percentage.text, "0.0%");

  const number = formatNumber(0, { decimals: 1, unit: "cm" });
  assert.equal(number.hasValue, true);
  assert.equal(number.text, "0.0 cm");
});

test("formatters return hasValue false rather than a plausible number", () => {
  const percentage = formatPercentage(undefined);
  assert.equal(percentage.hasValue, false);
  assert.equal(percentage.value, null);

  const number = formatNumber(null, { unit: "cm" });
  assert.equal(number.hasValue, false);

  const volume = formatVolume(undefined);
  assert.equal(volume.hasValue, false);
});

test("volume is derived from the fixed 8 L capacity", () => {
  assert.equal(TANK_CAPACITY_LITRES, 8.0);
  assert.equal(litresFromPercentage(100), 8);
  assert.equal(litresFromPercentage(50), 4);
  assert.equal(litresFromPercentage(0), 0);
  assert.equal(formatVolume(25).text, "2.00 L");
});

test("volume is clamped to the physical range", () => {
  // A miscalibrated sensor reporting 120% must not produce 9.6 L in a 8 L tank.
  assert.equal(litresFromPercentage(120), 8);
  assert.equal(litresFromPercentage(-5), 0);
});

test("a missing level yields a missing volume, never 0 L", () => {
  assert.equal(litresFromPercentage(null), null);
  assert.equal(litresFromPercentage(undefined), null);
  assert.equal(formatVolume(null).hasValue, false);
});

test("firmware tank statuses map to translation keys", () => {
  assert.equal(tankStatusKey("Empty"), "statusEmpty");
  assert.equal(tankStatusKey("Sensor Error"), "statusSensorError");
  assert.equal(tankStatusKey("Full"), "statusFull");
  // An unrecognised status returns null so the caller shows its own placeholder
  // rather than rendering a raw key on screen.
  assert.equal(tankStatusKey("Unknown"), null);
  assert.equal(tankStatusKey(undefined), null);
});
