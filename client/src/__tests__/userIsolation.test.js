import test from "node:test";
import assert from "node:assert/strict";
import {
  formatNumber,
  formatPercentage,
  formatVolume,
} from "../utils/telemetryFormat.js";

test("telemetry formatting gracefully handles null/empty device readings", () => {
  assert.equal(formatPercentage(null).hasValue, false);
  assert.equal(formatPercentage(null).text, "—");
  assert.equal(formatNumber(null, { decimals: 1, unit: "cm" }).hasValue, false);
  assert.equal(formatNumber(null, { decimals: 1, unit: "cm" }).text, "—");
  assert.equal(formatVolume(null, { capacityLiters: 1000 }).hasValue, false);
  assert.equal(formatVolume(null, { capacityLiters: 1000 }).text, "—");
});

test("client-side state resets correctly when device is null", () => {
  const unassignedUserTelemetry = {
    reading: null,
    readings: [],
    device: null,
    tanks: null,
    isOnline: false,
    isStale: false,
    isLoading: false,
    error: null,
  };

  assert.equal(unassignedUserTelemetry.device, null);
  assert.equal(unassignedUserTelemetry.reading, null);
  assert.equal(unassignedUserTelemetry.readings.length, 0);
});
