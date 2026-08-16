import test from "node:test";
import assert from "node:assert/strict";
import { analyticsQuerySchema } from "../routes/deviceRoutes.js";
import {
  computeDateRange,
  computeSummaryStats,
  computeBucketItem,
} from "../services/analyticsService.js";

test("analyticsQuerySchema accepts valid ranges and parameters", () => {
  const valid24h = analyticsQuerySchema.safeParse({ range: "24h" });
  assert.equal(valid24h.success, true);
  assert.equal(valid24h.data.range, "24h");

  const valid7d = analyticsQuerySchema.safeParse({ range: "7d", deviceId: "tank-01" });
  assert.equal(valid7d.success, true);
  assert.equal(valid7d.data.deviceId, "tank-01");

  const valid30d = analyticsQuerySchema.safeParse({ range: "30d" });
  assert.equal(valid30d.success, true);

  const validAll = analyticsQuerySchema.safeParse({ range: "all" });
  assert.equal(validAll.success, true);

  const invalidRange = analyticsQuerySchema.safeParse({ range: "yearly" });
  assert.equal(invalidRange.success, false);
});

test("analyticsQuerySchema parses ISO date bounds correctly", () => {
  const validDates = analyticsQuerySchema.safeParse({
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-08-15T23:59:59.999Z",
  });
  assert.equal(validDates.success, true);

  const invalidDate = analyticsQuerySchema.safeParse({
    from: "not-a-valid-date",
  });
  assert.equal(invalidDate.success, false);
});

test("computeDateRange correctly sets time boundaries", () => {
  const mockNow = new Date("2026-08-15T12:00:00.000Z");

  const range24h = computeDateRange("24h", undefined, undefined, mockNow);
  assert.equal(range24h.endDate.toISOString(), "2026-08-15T12:00:00.000Z");
  assert.equal(range24h.startDate.toISOString(), "2026-08-14T12:00:00.000Z");

  const range7d = computeDateRange("7d", undefined, undefined, mockNow);
  assert.equal(range7d.startDate.toISOString(), "2026-08-08T12:00:00.000Z");

  const customRange = computeDateRange("24h", "2026-08-01T00:00:00.000Z", "2026-08-05T00:00:00.000Z", mockNow);
  assert.equal(customRange.startDate.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(customRange.endDate.toISOString(), "2026-08-05T00:00:00.000Z");
});

test("computeSummaryStats handles empty and active datasets safely", () => {
  // 1. Empty dataset
  const emptyStats = computeSummaryStats(null);
  assert.equal(emptyStats.totalReadings, 0);
  assert.equal(emptyStats.pumpOnCount, 0);
  assert.equal(emptyStats.pumpRuntimeMinutes, 0);
  assert.equal(emptyStats.pumpDutyCyclePercent, 0);
  assert.equal(emptyStats.dawleAvailabilityPercent, 0);
  assert.equal(emptyStats.waterFlowActivePercent, 0);
  assert.equal(emptyStats.waterLevels.upper.avg, null);
  assert.equal(emptyStats.waterLevels.lower.avg, null);

  // 2. Active dataset
  const activeStats = computeSummaryStats({
    totalReadings: 1800,
    avgUpperLevel: 75.4,
    minUpperLevel: 20.0,
    maxUpperLevel: 90.0,
    avgLowerLevel: 62.1,
    minLowerLevel: 30.0,
    maxLowerLevel: 95.0,
    pumpOnCount: 300, // 300 samples * 2s = 600s = 10 mins
    autoModeCount: 1700,
    manualModeCount: 100,
    dawleCount: 1440, // 1440 / 1800 = 80%
    moteurCount: 360,
    flowActiveCount: 280,
    pumpOnDawleCount: 250,
    pumpOnMoteurCount: 50,
  });

  assert.equal(activeStats.totalReadings, 1800);
  assert.equal(activeStats.pumpOnCount, 300);
  assert.equal(activeStats.pumpRuntimeMinutes, 10.0);
  assert.equal(activeStats.pumpDutyCyclePercent, 16.7);
  assert.equal(activeStats.dawleAvailabilityPercent, 80.0);
  assert.equal(activeStats.moteurRuntimePercent, 20.0);
  assert.equal(activeStats.waterLevels.upper.avg, 75.4);
  assert.equal(activeStats.waterLevels.lower.avg, 62.1);
  assert.equal(activeStats.distribution.pumpMode.autoPercent, 94);
});

test("computeBucketItem calculates bucket metrics and duration accurately", () => {
  const bucket = computeBucketItem({
    _id: "2026-08-15T10:00:00.000Z",
    readingsCount: 120,
    avgUpperLevel: 65.23,
    minUpperLevel: 50.0,
    maxUpperLevel: 80.0,
    avgLowerLevel: 70.15,
    minLowerLevel: 60.0,
    maxLowerLevel: 85.0,
    pumpOnCount: 60, // 60 * 2s = 120s = 2 mins
    dawleCount: 120,
    flowActiveCount: 55,
  });

  assert.equal(bucket.readingsCount, 120);
  assert.equal(bucket.avgUpperLevel, 65.2);
  assert.equal(bucket.avgLowerLevel, 70.2);
  assert.equal(bucket.pumpRuntimeMinutes, 2.0);
  assert.equal(bucket.dawleAvailabilityPercent, 100);
  assert.equal(bucket.flowActiveCount, 55);
});
