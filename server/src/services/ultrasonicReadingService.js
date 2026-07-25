const ONLINE_WINDOW_MS = 10_000;

let latestReading = null;

export function saveLatestReading(payload) {
  const {
    deviceId = "tank-01",
    upperTank,
    lowerTank,
    pumpStatus = "OFF",
    systemEnabled = true,
    pumpMode = "AUTO",
    sensorStatus,
    failedSensor,
    // single tank fallbacks
    distanceCm,
    percentage,
    waterHeightCm,
    tankStatus,
  } = payload;

  const defaultUpper = upperTank || {
    distanceCm: distanceCm ?? 10.0,
    percentage: percentage ?? 75.0,
    waterHeightCm: waterHeightCm ?? 15.0,
    tankStatus:
      tankStatus ??
      (sensorStatus === "ERROR" && failedSensor === "UPPER"
        ? "Sensor Error"
        : "Normal"),
  };

  const defaultLower = lowerTank || {
    distanceCm: distanceCm ?? 8.0,
    percentage: percentage ?? 80.0,
    waterHeightCm: waterHeightCm ?? 17.0,
    tankStatus:
      tankStatus ??
      (sensorStatus === "ERROR" && failedSensor === "LOWER"
        ? "Sensor Error"
        : "Normal"),
  };

  if (sensorStatus === "ERROR") {
    if (failedSensor === "UPPER" || !failedSensor) {
      defaultUpper.tankStatus = "Sensor Error";
    }
    if (failedSensor === "LOWER" || !failedSensor) {
      defaultLower.tankStatus = "Sensor Error";
    }
  }

  latestReading = {
    deviceId,
    upperTank: {
      distanceCm: Number(defaultUpper.distanceCm ?? 0),
      percentage: Number(defaultUpper.percentage ?? 0),
      waterHeightCm: Number(defaultUpper.waterHeightCm ?? 0),
      tankStatus: String(defaultUpper.tankStatus || "Normal"),
    },
    lowerTank: {
      distanceCm: Number(defaultLower.distanceCm ?? 0),
      percentage: Number(defaultLower.percentage ?? 0),
      waterHeightCm: Number(defaultLower.waterHeightCm ?? 0),
      tankStatus: String(defaultLower.tankStatus || "Normal"),
    },
    pumpStatus: String(pumpStatus || "OFF"),
    systemEnabled: Boolean(systemEnabled ?? true),
    pumpMode: String(pumpMode || "AUTO"),
    sensorStatus: sensorStatus ? String(sensorStatus) : undefined,
    failedSensor: failedSensor ? String(failedSensor) : undefined,
    receivedAt: new Date(),
  };

  return serializeReading(latestReading);
}

export function getLatestReading() {
  if (!latestReading) {
    return null;
  }

  return withOnlineStatus(serializeReading(latestReading));
}

function serializeReading(reading) {
  return {
    deviceId: reading.deviceId,
    upperTank: reading.upperTank,
    lowerTank: reading.lowerTank,
    pumpStatus: reading.pumpStatus,
    systemEnabled: reading.systemEnabled,
    pumpMode: reading.pumpMode,
    sensorStatus: reading.sensorStatus,
    failedSensor: reading.failedSensor,
    receivedAt: reading.receivedAt.toISOString(),
    // Backward compatibility for single-tank clients
    distanceCm: reading.upperTank.distanceCm,
    percentage: reading.upperTank.percentage,
    waterHeightCm: reading.upperTank.waterHeightCm,
    tankStatus: reading.upperTank.tankStatus,
  };
}

function withOnlineStatus(reading) {
  return {
    ...reading,
    isOnline:
      Date.now() - new Date(reading.receivedAt).getTime() < ONLINE_WINDOW_MS,
  };
}
