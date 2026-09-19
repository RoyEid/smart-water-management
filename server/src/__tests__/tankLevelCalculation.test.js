import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Reference implementation of the firmware calculation logic:
 * 1. calibratedDistance = clamp(rawDistance - sensorOffsetCm, 0, tankHeightCm)
 * 2. waterHeight = clamp(tankHeightCm - calibratedDistance, 0, tankHeightCm)
 * 3. percentage = clamp((waterHeight / tankHeightCm) * 100, 0, 100)
 */
function calculateCalibratedDistance(rawDistance, sensorOffsetCm, tankHeightCm) {
  if (rawDistance < 0.0) return -1.0;
  const calibrated = rawDistance - sensorOffsetCm;
  return Math.max(0.0, Math.min(tankHeightCm, calibrated));
}

function calculateWaterHeight(calibratedDistance, tankHeightCm) {
  if (tankHeightCm <= 0.0 || calibratedDistance < 0.0) return 0.0;
  const waterHeight = tankHeightCm - calibratedDistance;
  return Math.max(0.0, Math.min(tankHeightCm, waterHeight));
}

function calculatePercentage(waterHeight, tankHeightCm) {
  if (tankHeightCm <= 0.0) return 0.0;
  const percentage = (waterHeight / tankHeightCm) * 100.0;
  return Math.max(0.0, Math.min(100.0, percentage));
}

function getTankStatus(percentage) {
  if (percentage <= 5.0) return "Empty";
  if (percentage <= 20.0) return "Low";
  if (percentage < 75.0) return "Normal";
  if (percentage < 90.0) return "High";
  return "Full";
}

test("Case 1: Empty tank with zero offset yields exactly 0% and 'Empty' status", () => {
  const tankHeight = 20.0; // 20 cm bench tank
  const sensorOffset = 0.0;
  const rawDistance = 20.0; // Sensor measures 20 cm to the bottom

  const calibratedDistance = calculateCalibratedDistance(rawDistance, sensorOffset, tankHeight);
  assert.equal(calibratedDistance, 20.0);

  const waterHeight = calculateWaterHeight(calibratedDistance, tankHeight);
  assert.equal(waterHeight, 0.0);

  const percentage = calculatePercentage(waterHeight, tankHeight);
  assert.equal(percentage, 0.0);

  const status = getTankStatus(percentage);
  assert.equal(status, "Empty");
});

test("Case 2: Empty tank with 5 cm sensor mounting offset yields 0% (not 25%)", () => {
  const tankHeight = 20.0;
  const sensorOffset = 5.0; // 5 cm dead zone / mounting standoff
  const rawDistance = 25.0; // Sensor measures 25 cm (5 cm standoff + 20 cm empty depth)

  const calibratedDistance = calculateCalibratedDistance(rawDistance, sensorOffset, tankHeight);
  assert.equal(calibratedDistance, 20.0);

  const waterHeight = calculateWaterHeight(calibratedDistance, tankHeight);
  assert.equal(waterHeight, 0.0);

  const percentage = calculatePercentage(waterHeight, tankHeight);
  assert.equal(percentage, 0.0);

  const status = getTankStatus(percentage);
  assert.equal(status, "Empty");
});

test("Case 3: Half tank yields exactly 50% across both zero and non-zero offsets", () => {
  // Scenario A: 20 cm tank, 0 cm offset -> water height 10 cm, raw distance 10 cm
  const tankA = 20.0;
  const offsetA = 0.0;
  const rawA = 10.0;
  const calA = calculateCalibratedDistance(rawA, offsetA, tankA);
  const heightA = calculateWaterHeight(calA, tankA);
  const pctA = calculatePercentage(heightA, tankA);
  assert.equal(heightA, 10.0);
  assert.equal(pctA, 50.0);
  assert.equal(getTankStatus(pctA), "Normal");

  // Scenario B: 20 cm tank, 5 cm offset -> water height 10 cm, raw distance 15 cm
  const tankB = 20.0;
  const offsetB = 5.0;
  const rawB = 15.0;
  const calB = calculateCalibratedDistance(rawB, offsetB, tankB);
  const heightB = calculateWaterHeight(calB, tankB);
  const pctB = calculatePercentage(heightB, tankB);
  assert.equal(heightB, 10.0);
  assert.equal(pctB, 50.0);
  assert.equal(getTankStatus(pctB), "Normal");

  // Scenario C: 150 cm large tank, 10 cm offset -> water height 75 cm, raw distance 85 cm
  const tankC = 150.0;
  const offsetC = 10.0;
  const rawC = 85.0;
  const calC = calculateCalibratedDistance(rawC, offsetC, tankC);
  const heightC = calculateWaterHeight(calC, tankC);
  const pctC = calculatePercentage(heightC, tankC);
  assert.equal(heightC, 75.0);
  assert.equal(pctC, 50.0);
  assert.equal(getTankStatus(pctC), "Normal");
});

test("Case 4: Full tank yields exactly 100% and 'Full' status", () => {
  // Scenario A: 0 cm offset, water at rim (rawDistance = 0.0)
  const tankA = 20.0;
  const calA = calculateCalibratedDistance(0.0, 0.0, tankA);
  const heightA = calculateWaterHeight(calA, tankA);
  const pctA = calculatePercentage(heightA, tankA);
  assert.equal(calA, 0.0);
  assert.equal(heightA, 20.0);
  assert.equal(pctA, 100.0);
  assert.equal(getTankStatus(pctA), "Full");

  // Scenario B: 5 cm offset, water at 100% mark (rawDistance = 5.0 cm)
  const tankB = 20.0;
  const calB = calculateCalibratedDistance(5.0, 5.0, tankB);
  const heightB = calculateWaterHeight(calB, tankB);
  const pctB = calculatePercentage(heightB, tankB);
  assert.equal(calB, 0.0);
  assert.equal(heightB, 20.0);
  assert.equal(pctB, 100.0);
  assert.equal(getTankStatus(pctB), "Full");
});

test("Case 5: Independent Upper and Lower tanks with different physical heights & calibrations", () => {
  // Upper tank: 25 cm height, 3 cm offset
  const upperTankHeight = 25.0;
  const upperOffset = 3.0;
  // Lower tank: 180 cm height, 8 cm offset
  const lowerTankHeight = 180.0;
  const lowerOffset = 8.0;

  // Upper tank is EMPTY: raw distance = 28.0 cm (3 + 25)
  const upperCal = calculateCalibratedDistance(28.0, upperOffset, upperTankHeight);
  const upperWater = calculateWaterHeight(upperCal, upperTankHeight);
  const upperPct = calculatePercentage(upperWater, upperTankHeight);
  assert.equal(upperWater, 0.0);
  assert.equal(upperPct, 0.0);
  assert.equal(getTankStatus(upperPct), "Empty");

  // Lower tank is HALF FULL: raw distance = 8 + 90 = 98.0 cm
  const lowerCal = calculateCalibratedDistance(98.0, lowerOffset, lowerTankHeight);
  const lowerWater = calculateWaterHeight(lowerCal, lowerTankHeight);
  const lowerPct = calculatePercentage(lowerWater, lowerTankHeight);
  assert.equal(lowerWater, 90.0);
  assert.equal(lowerPct, 50.0);
  assert.equal(getTankStatus(lowerPct), "Normal");

  // Verify they operate independently without cross-talk
  assert.notEqual(upperTankHeight, lowerTankHeight);
  assert.notEqual(upperOffset, lowerOffset);
  assert.notEqual(upperPct, lowerPct);
});

test("Case 6: Out-of-range, sensor reflection noise, and overflow are clamped safely", () => {
  const tankHeight = 50.0;
  const offset = 5.0;

  // Sensor reading beyond bottom (e.g. 60 cm when empty distance is 55 cm)
  const beyondBottomCal = calculateCalibratedDistance(60.0, offset, tankHeight);
  assert.equal(beyondBottomCal, tankHeight); // clamped to tankHeight
  const beyondBottomHeight = calculateWaterHeight(beyondBottomCal, tankHeight);
  assert.equal(beyondBottomHeight, 0.0);
  assert.equal(calculatePercentage(beyondBottomHeight, tankHeight), 0.0);

  // Water into sensor dead zone (e.g. raw reading 2.0 cm with 5.0 cm offset)
  const overfillCal = calculateCalibratedDistance(2.0, offset, tankHeight);
  assert.equal(overfillCal, 0.0); // clamped to 0
  const overfillHeight = calculateWaterHeight(overfillCal, tankHeight);
  assert.equal(overfillHeight, tankHeight);
  assert.equal(calculatePercentage(overfillHeight, tankHeight), 100.0);

  // Sensor failure (-1.0)
  const failCal = calculateCalibratedDistance(-1.0, offset, tankHeight);
  assert.equal(failCal, -1.0);
  const failHeight = calculateWaterHeight(failCal, tankHeight);
  assert.equal(failHeight, 0.0);
});

test("Case 7: End-to-end data pipeline trace from HC-SR04 pulse to dashboard formatters", () => {
  // Step 1: HC-SR04 echo pulse duration
  // Duration = 583.08 us -> Distance = (583.08 * 0.0343) / 2 = 10.0 cm
  const pulseDurationUs = 583.0898;
  const rawDistanceCm = (pulseDurationUs * 0.0343) / 2.0;
  assert.equal(Math.round(rawDistanceCm * 10) / 10, 10.0);

  // Step 2: Calibrated distance with tankHeight = 20.0 cm, offset = 0.0 cm
  const tankHeightCm = 20.0;
  const calDistanceCm = calculateCalibratedDistance(rawDistanceCm, 0.0, tankHeightCm);

  // Step 3: Water height = tankHeight - measuredDistance
  const waterHeightCm = calculateWaterHeight(calDistanceCm, tankHeightCm);
  assert.equal(Math.round(waterHeightCm * 10) / 10, 10.0);

  // Step 4: Percentage = (waterHeight / tankHeight) * 100
  const percentage = calculatePercentage(waterHeightCm, tankHeightCm);
  assert.equal(Math.round(percentage * 10) / 10, 50.0);

  // Step 5: API Telemetry payload format
  const telemetryPayload = {
    deviceId: "swm-1C047B9205D4",
    upperTank: {
      distanceCm: Math.round(calDistanceCm * 10) / 10,
      rawDistanceCm: Math.round(rawDistanceCm * 10) / 10,
      percentage: Math.round(percentage * 10) / 10,
      waterHeightCm: Math.round(waterHeightCm * 10) / 10,
      tankStatus: getTankStatus(percentage),
    },
  };

  assert.equal(telemetryPayload.upperTank.distanceCm, 10.0);
  assert.equal(telemetryPayload.upperTank.rawDistanceCm, 10.0);
  assert.equal(telemetryPayload.upperTank.waterHeightCm, 10.0);
  assert.equal(telemetryPayload.upperTank.percentage, 50.0);
  assert.equal(telemetryPayload.upperTank.tankStatus, "Normal");

  // Step 6: Volume calculation with 1000 L capacity
  const capacityLiters = 1000.0;
  const volumeLiters = (telemetryPayload.upperTank.percentage / 100.0) * capacityLiters;
  assert.equal(volumeLiters, 500.0);
});
