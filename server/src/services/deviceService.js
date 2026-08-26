import crypto from "crypto";
import Device from "../models/Device.js";

export function hashClaimCode(code) {
  if (!code) return null;
  return crypto.createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");
}

export function generateClaimCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PAIR-";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Devices register themselves the first time they report.
 *
 * Doing it here rather than through a provisioning UI means the architecture
 * already supports a second ESP32: plug it in with a different DEVICE_ID and
 * it appears in the Devices list with its own telemetry, no code change.
 */
export async function touchDevice(reading) {
  if (!reading?.deviceId) return null;

  try {
    const rawClaimCode = generateClaimCode();
    const claimCodeHash = hashClaimCode(rawClaimCode);

    return await Device.findOneAndUpdate(
      { deviceId: reading.deviceId },
      {
        $set: {
          lastSeenAt: reading.receivedAt ? new Date(reading.receivedAt) : new Date(),
          // Only recorded when the device actually reports one. The current
          // ultrasonic firmware does not, so this stays null and the UI says
          // "Not reported" rather than showing an invented version.
          ...(reading.firmwareVersion
            ? { firmwareVersion: String(reading.firmwareVersion) }
            : {}),
        },
        $inc: { totalReadings: 1 },
        $setOnInsert: {
          deviceId: reading.deviceId,
          displayName: "",
          firstSeenAt: new Date(),
          claimCode: rawClaimCode,
          claimCodeHash: claimCodeHash,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    // A registry write failing must never reject a valid telemetry POST.
    console.error(`[Devices] Failed to record ${reading.deviceId}:`, error.message);
    return null;
  }
}

export const DEVICE_ONLINE_WINDOW_MS = 10_000;

export function isDeviceOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < DEVICE_ONLINE_WINDOW_MS;
}
