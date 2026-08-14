import test from "node:test";
import assert from "node:assert/strict";
import {
  formatNumber,
  formatPercentage,
  formatVolume,
  hasValue,
  litresFromPercentage,
  tankStatusKey,
} from "../utils/telemetryFormat.js";

/**
 * Telemetry formatting guard test suite.
 */

test("a missing value is reported as absent, not as zero", () => {
  for (const missing of [null, undefined, NaN, Infinity, "50", {}]) {
    assert.equal(hasValue(missing), false, `${String(missing)} should not count as a value`);
  }
});

test("zero is a real reading and survives formatting", () => {
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

test("Test 1: capacity = 1000 L, percentage = 23.6% -> volume = 236 L", () => {
  const litres = litresFromPercentage(23.6, 1000);
  assert.equal(Math.round(litres), 236);

  const formatted = formatVolume(23.6, { capacityLiters: 1000 });
  assert.equal(formatted.hasValue, true);
  assert.equal(formatted.text, "236 L / 1,000 L");
});

test("Test 2: capacity = 1000 L, percentage = 22.6% -> volume = 226 L", () => {
  const litres = litresFromPercentage(22.6, 1000);
  assert.equal(Math.round(litres), 226);

  const formatted = formatVolume(22.6, { capacityLiters: 1000 });
  assert.equal(formatted.hasValue, true);
  assert.equal(formatted.text, "226 L / 1,000 L");
});

test("Test 3: capacity = 10000 L, percentage = 70% -> volume = 7000 L", () => {
  const litres = litresFromPercentage(70, 10000);
  assert.equal(litres, 7000);

  const formatted = formatVolume(70, { capacityLiters: 10000 });
  assert.equal(formatted.hasValue, true);
  assert.equal(formatted.text, "7,000 L / 10,000 L");
});

test("Test 4: capacity = 1000 L, percentage = 0% -> volume = 0 L (hasValue = true, never Waiting for data)", () => {
  const litres = litresFromPercentage(0, 1000);
  assert.equal(litres, 0);

  const formatted = formatVolume(0, { capacityLiters: 1000 });
  assert.equal(formatted.hasValue, true);
  assert.equal(formatted.value, 0);
  assert.equal(formatted.text, "0 L / 1,000 L");
});

test("Test 5: capacity = null, percentage = 23.6% -> Not configured (never Waiting for data)", () => {
  assert.equal(litresFromPercentage(23.6, null), null);

  const formatted = formatVolume(23.6, { capacityLiters: null });
  assert.equal(formatted.hasValue, false);
  assert.equal(formatted.text, "Not configured");
});

test("Test 6: capacity = 1000 L, percentage = null -> Waiting for data placeholder ('—')", () => {
  assert.equal(litresFromPercentage(null, 1000), null);

  const formatted = formatVolume(null, { capacityLiters: 1000 });
  assert.equal(formatted.hasValue, false);
  assert.equal(formatted.text, "—");
});

test("Test 7: upper capacity = 10000 L @ 50% (5000 L) and lower capacity = 2000 L @ 50% (1000 L)", () => {
  const upperVol = litresFromPercentage(50, 10000);
  const lowerVol = litresFromPercentage(50, 2000);

  assert.equal(upperVol, 5000);
  assert.equal(lowerVol, 1000);
});

test("Test 8: change capacity 1000 L -> 2000 L while percentage remains 25% updates volume 250 L -> 500 L", () => {
  const vol1 = litresFromPercentage(25, 1000);
  assert.equal(vol1, 250);

  const vol2 = litresFromPercentage(25, 2000);
  assert.equal(vol2, 500);
});

test("Test 9: verify no active volume calculation uses prototype 8 L", () => {
  const formattedWithoutCapacity = formatVolume(23.6);
  assert.equal(formattedWithoutCapacity.hasValue, false);
  assert.equal(formattedWithoutCapacity.text, "Not configured");
  assert.notEqual(formattedWithoutCapacity.value, 1.888);
});

test("firmware tank statuses map to translation keys", () => {
  assert.equal(tankStatusKey("Empty"), "statusEmpty");
  assert.equal(tankStatusKey("Sensor Error"), "statusSensorError");
  assert.equal(tankStatusKey("Full"), "statusFull");
  assert.equal(tankStatusKey("Unknown"), null);
  assert.equal(tankStatusKey(undefined), null);
});
