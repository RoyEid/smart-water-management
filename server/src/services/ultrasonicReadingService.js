const ONLINE_WINDOW_MS = 10_000;

let latestReading = null;

// Controllers depend on this service boundary rather than the storage detail,
// so the in-memory implementation can later be replaced with MongoDB.
export function saveLatestReading({
  deviceId,
  distanceCm,
  percentage,
  waterHeightCm,
  tankStatus,
  pumpStatus,
}) {
  latestReading = {
    deviceId,
    distanceCm,
    percentage,
    waterHeightCm,
    tankStatus,
    pumpStatus,
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
    distanceCm: reading.distanceCm,
    percentage: reading.percentage,
    waterHeightCm: reading.waterHeightCm,
    tankStatus: reading.tankStatus,
    pumpStatus: reading.pumpStatus,
    receivedAt: reading.receivedAt.toISOString(),
  };
}

function withOnlineStatus(reading) {
  return {
    ...reading,
    isOnline:
      Date.now() - new Date(reading.receivedAt).getTime() < ONLINE_WINDOW_MS,
  };
}
