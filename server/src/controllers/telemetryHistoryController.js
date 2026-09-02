import Device from "../models/Device.js";
import UltrasonicReading from "../models/UltrasonicReading.js";
import { getUserAccessibleDevices } from "../services/deviceAccessService.js";
import { serializeStoredReading } from "./deviceController.js";

// Export is capped well above a normal page but far below the collection size:
// enough for a meaningful CSV, not enough to stream the database into memory.
const MAX_EXPORT_ROWS = 5000;

/**
 * Translates the query filters into a Mongo filter.
 *
 * Shared by the list and export handlers so a filter combination can never
 * mean one thing on screen and another in the downloaded file.
 */
function buildFilter(query) {
  const filter = {};

  if (query.deviceId) filter.deviceId = query.deviceId;
  if (query.pumpStatus) filter.pumpStatus = query.pumpStatus;
  if (query.pumpMode) filter.pumpMode = query.pumpMode;
  if (query.powerSource) filter.powerSource = query.powerSource;

  if (query.from || query.to) {
    filter.receivedAt = {};
    if (query.from) filter.receivedAt.$gte = query.from;
    if (query.to) filter.receivedAt.$lte = query.to;
  }

  // "tank" narrows which tank must satisfy the level bounds. Without a tank
  // filter the level bounds apply to the upper tank, which is the one the
  // dashboard headlines.
  const tankPrefix = query.tank === "lower" ? "lowerTank" : "upperTank";
  if (query.minLevel !== undefined || query.maxLevel !== undefined) {
    filter[`${tankPrefix}.percentage`] = {};
    if (query.minLevel !== undefined) {
      filter[`${tankPrefix}.percentage`].$gte = query.minLevel;
    }
    if (query.maxLevel !== undefined) {
      filter[`${tankPrefix}.percentage`].$lte = query.maxLevel;
    }
  }

  return filter;
}

export async function listTelemetryHistory(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const filter = buildFilter(query);

    const accessibleDevices = await getUserAccessibleDevices(req.user);

    if (accessibleDevices.length === 0) {
      return res.status(200).json({
        success: true,
        readings: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    if (query.deviceId) {
      const target = accessibleDevices.find((d) => d.deviceId === query.deviceId);
      if (!target) {
        const error = new Error("You are not authorized to view telemetry for this device.");
        error.statusCode = 403;
        return next(error);
      }
      filter.deviceId = target.deviceId;
      if (target.ownerAssignedAt) {
        filter.receivedAt = filter.receivedAt
          ? { ...filter.receivedAt, $gte: target.ownerAssignedAt }
          : { $gte: target.ownerAssignedAt };
      }
    } else {
      if (accessibleDevices.length === 1) {
        const target = accessibleDevices[0];
        filter.deviceId = target.deviceId;
        if (target.ownerAssignedAt) {
          filter.receivedAt = filter.receivedAt
            ? { ...filter.receivedAt, $gte: target.ownerAssignedAt }
            : { $gte: target.ownerAssignedAt };
        }
      } else {
        filter.$or = accessibleDevices.map((d) => ({
          deviceId: d.deviceId,
          ...(d.ownerAssignedAt ? { receivedAt: { $gte: d.ownerAssignedAt } } : {}),
        }));
      }
    }

    const { page, limit } = query;

    // skip/limit at the database, never in JavaScript: the collection grows by
    // 30 documents a minute per device and must never be fully materialised.
    const [readings, total] = await Promise.all([
      UltrasonicReading.find(filter)
        .sort({ receivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UltrasonicReading.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      readings: readings.map(serializeStoredReading),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Quote anything that would otherwise break the column structure, and double
  // any embedded quote per RFC 4180.
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function exportTelemetryHistory(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const filter = buildFilter(query);

    const accessibleDevices = await getUserAccessibleDevices(req.user);

    if (accessibleDevices.length === 0) {
      const columns = [
        "receivedAt", "deviceId", "upperPercentage", "upperDistanceCm", "upperWaterHeightCm",
        "upperStatus", "lowerPercentage", "lowerDistanceCm", "lowerWaterHeightCm", "lowerStatus",
        "pumpStatus", "pumpRunning", "pumpMode", "systemEnabled", "powerSource", "allowPumpOnMoteur", "waterFlowDetected"
      ];
      const emptyCsv = columns.join(",") + "\r\n";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="telemetry-export.csv"');
      return res.status(200).send(emptyCsv);
    }

    if (query.deviceId) {
      const target = accessibleDevices.find((d) => d.deviceId === query.deviceId);
      if (!target) {
        const error = new Error("You are not authorized to export telemetry for this device.");
        error.statusCode = 403;
        return next(error);
      }
      filter.deviceId = target.deviceId;
      if (target.ownerAssignedAt) {
        filter.receivedAt = filter.receivedAt
          ? { ...filter.receivedAt, $gte: target.ownerAssignedAt }
          : { $gte: target.ownerAssignedAt };
      }
    } else {
      if (accessibleDevices.length === 1) {
        const target = accessibleDevices[0];
        filter.deviceId = target.deviceId;
        if (target.ownerAssignedAt) {
          filter.receivedAt = filter.receivedAt
            ? { ...filter.receivedAt, $gte: target.ownerAssignedAt }
            : { $gte: target.ownerAssignedAt };
        }
      } else {
        filter.$or = accessibleDevices.map((d) => ({
          deviceId: d.deviceId,
          ...(d.ownerAssignedAt ? { receivedAt: { $gte: d.ownerAssignedAt } } : {}),
        }));
      }
    }

    const readings = await UltrasonicReading.find(filter)
      .sort({ receivedAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean();

    const columns = [
      "receivedAt",
      "deviceId",
      "upperPercentage",
      "upperDistanceCm",
      "upperWaterHeightCm",
      "upperStatus",
      "lowerPercentage",
      "lowerDistanceCm",
      "lowerWaterHeightCm",
      "lowerStatus",
      "pumpStatus",
      "pumpMode",
      "systemEnabled",
      "waterFlowDetected",
      "powerSource",
      "allowPumpOnMoteur",
    ];

    const lines = [columns.join(",")];

    for (const reading of readings) {
      lines.push(
        [
          reading.receivedAt ? new Date(reading.receivedAt).toISOString() : "",
          reading.deviceId,
          reading.upperTank?.percentage,
          reading.upperTank?.distanceCm,
          reading.upperTank?.waterHeightCm,
          reading.upperTank?.tankStatus,
          reading.lowerTank?.percentage,
          reading.lowerTank?.distanceCm,
          reading.lowerTank?.waterHeightCm,
          reading.lowerTank?.tankStatus,
          reading.pumpStatus,
          reading.pumpMode,
          reading.systemEnabled,
          reading.waterFlowDetected ?? "",
          reading.powerSource ?? "MOTEUR",
          Boolean(reading.allowPumpOnMoteur),
        ]
          .map(csvCell)
          .join(",")
      );
    }

    const filename = `telemetry-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    // Tells the client when the export hit the cap rather than silently
    // handing back a truncated file that looks complete.
    res.setHeader("X-Export-Row-Count", String(readings.length));
    res.setHeader("X-Export-Truncated", readings.length >= MAX_EXPORT_ROWS ? "true" : "false");
    res.status(200).send(lines.join("\r\n"));
  } catch (error) {
    next(error);
  }
}

export { MAX_EXPORT_ROWS };
