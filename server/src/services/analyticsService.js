import UltrasonicReading from "../models/UltrasonicReading.js";
import Device from "../models/Device.js";

export const NOMINAL_SAMPLE_INTERVAL_SECONDS = 2; // ESP32 sends telemetry every 2 seconds

/**
 * Calculates start and end timestamps from range string or explicit dates.
 */
export function computeDateRange(range = "24h", from, to, now = new Date()) {
  const endDate = to ? new Date(to) : now;
  let startDate;

  if (from) {
    startDate = new Date(from);
  } else if (range === "24h") {
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (range === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // "all": default to 90 days if unbound
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

/**
 * Pure calculation of summary statistics from raw aggregation result.
 */
export function computeSummaryStats(summaryStats) {
  const total = summaryStats?.totalReadings ?? 0;
  const pumpOnPoints = summaryStats?.pumpOnCount ?? 0;

  const estimatedPumpSeconds = pumpOnPoints * NOMINAL_SAMPLE_INTERVAL_SECONDS;
  const pumpRuntimeMinutes = Math.round((estimatedPumpSeconds / 60) * 10) / 10;
  const pumpDutyCyclePercent =
    total > 0 ? Math.round((pumpOnPoints / total) * 1000) / 10 : 0;

  const dawleCount = summaryStats?.dawleCount ?? 0;
  const dawleAvailabilityPercent =
    total > 0 ? Math.round((dawleCount / total) * 1000) / 10 : 0;
  const moteurRuntimePercent =
    total > 0 ? Math.round(((total - dawleCount) / total) * 1000) / 10 : 0;

  const flowActiveCount = summaryStats?.flowActiveCount ?? 0;
  const waterFlowActivePercent =
    total > 0 ? Math.round((flowActiveCount / total) * 1000) / 10 : 0;

  return {
    totalReadings: total,
    pumpOnCount: pumpOnPoints,
    pumpRuntimeMinutes,
    pumpDutyCyclePercent,
    dawleAvailabilityPercent,
    moteurRuntimePercent,
    waterFlowActivePercent,
    waterLevels: {
      upper: {
        avg: summaryStats?.avgUpperLevel != null ? Math.round(summaryStats.avgUpperLevel * 10) / 10 : null,
        min: summaryStats?.minUpperLevel != null ? Math.round(summaryStats.minUpperLevel * 10) / 10 : null,
        max: summaryStats?.maxUpperLevel != null ? Math.round(summaryStats.maxUpperLevel * 10) / 10 : null,
      },
      lower: {
        avg: summaryStats?.avgLowerLevel != null ? Math.round(summaryStats.avgLowerLevel * 10) / 10 : null,
        min: summaryStats?.minLowerLevel != null ? Math.round(summaryStats.minLowerLevel * 10) / 10 : null,
        max: summaryStats?.maxLowerLevel != null ? Math.round(summaryStats.maxLowerLevel * 10) / 10 : null,
      },
    },
    distribution: {
      powerSource: {
        dawlePercent: dawleAvailabilityPercent,
        moteurPercent: moteurRuntimePercent,
        dawleReadingCount: dawleCount,
        moteurReadingCount: total - dawleCount,
        pumpOnDawleMinutes: Math.round(((summaryStats?.pumpOnDawleCount ?? 0) * NOMINAL_SAMPLE_INTERVAL_SECONDS / 60) * 10) / 10,
        pumpOnMoteurMinutes: Math.round(((summaryStats?.pumpOnMoteurCount ?? 0) * NOMINAL_SAMPLE_INTERVAL_SECONDS / 60) * 10) / 10,
      },
      pumpMode: {
        autoPercent: total > 0 ? Math.round(((summaryStats?.autoModeCount ?? 0) / total) * 100) : 0,
        manualPercent: total > 0 ? Math.round(((summaryStats?.manualModeCount ?? 0) / total) * 100) : 0,
      },
    },
  };
}

/**
 * Pure calculation of a single time bucket aggregation item.
 */
export function computeBucketItem(b) {
  const bucketPumpSec = (b.pumpOnCount ?? 0) * NOMINAL_SAMPLE_INTERVAL_SECONDS;
  const bucketPumpMin = Math.round((bucketPumpSec / 60) * 10) / 10;
  const count = b.readingsCount ?? 0;
  const bucketDawlePercent =
    count > 0 ? Math.round(((b.dawleCount ?? 0) / count) * 100) : 0;

  return {
    timestamp: b._id ? new Date(b._id).toISOString() : null,
    readingsCount: count,
    avgUpperLevel: b.avgUpperLevel != null ? Math.round(b.avgUpperLevel * 10) / 10 : null,
    minUpperLevel: b.minUpperLevel != null ? Math.round(b.minUpperLevel * 10) / 10 : null,
    maxUpperLevel: b.maxUpperLevel != null ? Math.round(b.maxUpperLevel * 10) / 10 : null,
    avgLowerLevel: b.avgLowerLevel != null ? Math.round(b.avgLowerLevel * 10) / 10 : null,
    minLowerLevel: b.minLowerLevel != null ? Math.round(b.minLowerLevel * 10) / 10 : null,
    maxLowerLevel: b.maxLowerLevel != null ? Math.round(b.maxLowerLevel * 10) / 10 : null,
    pumpRuntimeMinutes: bucketPumpMin,
    dawleAvailabilityPercent: bucketDawlePercent,
    flowActiveCount: b.flowActiveCount ?? 0,
  };
}

/**
 * Calculates analytics overview, time-series buckets, and distribution KPIs.
 */
export async function getAnalyticsOverview({
  deviceId,
  range = "24h",
  from,
  to,
} = {}) {
  if (!deviceId) return null;

  const { startDate, endDate } = computeDateRange(range, from, to);

  let upperCapacity = 1000;
  let lowerCapacity = 1000;

  try {
    const device = await Device.findOne({ deviceId }).lean();
    if (device?.tanks?.upper?.capacityLiters > 0) {
      upperCapacity = device.tanks.upper.capacityLiters;
    }
    if (device?.tanks?.lower?.capacityLiters > 0) {
      lowerCapacity = device.tanks.lower.capacityLiters;
    }
  } catch (err) {
    // Fall back to 1000 L defaults if device query fails
  }

  const matchFilter = {
    deviceId,
    receivedAt: { $gte: startDate, $lte: endDate },
  };

  // 1. Summary Metrics Aggregation Pipeline
  const [summaryStats] = await UltrasonicReading.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalReadings: { $sum: 1 },
        avgUpperLevel: { $avg: "$upperTank.percentage" },
        minUpperLevel: { $min: "$upperTank.percentage" },
        maxUpperLevel: { $max: "$upperTank.percentage" },
        avgLowerLevel: { $avg: "$lowerTank.percentage" },
        minLowerLevel: { $min: "$lowerTank.percentage" },
        maxLowerLevel: { $max: "$lowerTank.percentage" },
        pumpOnCount: {
          $sum: { $cond: [{ $eq: ["$pumpStatus", "ON"] }, 1, 0] },
        },
        autoModeCount: {
          $sum: { $cond: [{ $eq: ["$pumpMode", "AUTO"] }, 1, 0] },
        },
        manualModeCount: {
          $sum: { $cond: [{ $eq: ["$pumpMode", "MANUAL"] }, 1, 0] },
        },
        dawleCount: {
          $sum: { $cond: [{ $eq: ["$powerSource", "DAWLE"] }, 1, 0] },
        },
        moteurCount: {
          $sum: { $cond: [{ $eq: ["$powerSource", "MOTEUR"] }, 1, 0] },
        },
        flowActiveCount: {
          $sum: { $cond: [{ $eq: ["$waterFlowDetected", true] }, 1, 0] },
        },
        pumpOnDawleCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$pumpStatus", "ON"] },
                  { $eq: ["$powerSource", "DAWLE"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        pumpOnMoteurCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$pumpStatus", "ON"] },
                  { $eq: ["$powerSource", "MOTEUR"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const summary = computeSummaryStats(summaryStats);

  // 2. Time-Series Buckets for Trend Charts
  const bucketUnit = range === "24h" ? "hour" : "day";

  const bucketPipeline = [
    { $match: matchFilter },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$receivedAt",
            unit: bucketUnit,
          },
        },
        readingsCount: { $sum: 1 },
        avgUpperLevel: { $avg: "$upperTank.percentage" },
        minUpperLevel: { $min: "$upperTank.percentage" },
        maxUpperLevel: { $max: "$upperTank.percentage" },
        avgLowerLevel: { $avg: "$lowerTank.percentage" },
        minLowerLevel: { $min: "$lowerTank.percentage" },
        maxLowerLevel: { $max: "$lowerTank.percentage" },
        pumpOnCount: {
          $sum: { $cond: [{ $eq: ["$pumpStatus", "ON"] }, 1, 0] },
        },
        dawleCount: {
          $sum: { $cond: [{ $eq: ["$powerSource", "DAWLE"] }, 1, 0] },
        },
        flowActiveCount: {
          $sum: { $cond: [{ $eq: ["$waterFlowDetected", true] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const rawBuckets = await UltrasonicReading.aggregate(bucketPipeline);
  const buckets = rawBuckets.map(computeBucketItem);

  return {
    range,
    deviceId,
    timeframe: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    tankCapacities: {
      upperLiters: upperCapacity,
      lowerLiters: lowerCapacity,
    },
    summary,
    buckets,
  };
}
