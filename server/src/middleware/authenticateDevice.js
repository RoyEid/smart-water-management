import crypto from "crypto";

function hashKey(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest();
}

export default function authenticateDevice(req, res, next) {
  const configuredKey = process.env.DEVICE_API_KEY;

  if (!configuredKey) {
    console.error(
      "[Device Auth] DEVICE_API_KEY is not set in server/.env. " +
      "Every device request will be rejected until it is configured."
    );

    const error = new Error("Device API authentication is not configured.");
    error.statusCode = 500;
    return next(error);
  }

  const providedKey = req.get("x-device-key");

  if (typeof providedKey !== "string") {
    console.warn(
      `[Device Auth] REJECTED ${req.method} ${req.originalUrl} from ${req.ip}: the x-device-key header is missing.`
    );

    const error = new Error("Missing device API key header 'x-device-key'.");
    error.statusCode = 401;
    return next(error);
  }

  const isValid = crypto.timingSafeEqual(
    hashKey(providedKey.trim()),
    hashKey(configuredKey.trim())
  );

  if (!isValid) {
    console.warn(
      `[Device Auth] REJECTED ${req.method} ${req.originalUrl} from ${req.ip}: ` +
      `x-device-key did not match (received ${providedKey.trim().length} chars, ` +
      `expected ${configuredKey.trim().length}).`
    );

    const error = new Error("Invalid device API key.");
    error.statusCode = 401;
    return next(error);
  }

  const deviceId =
    req.query?.deviceId ||
    req.body?.deviceId ||
    req.get("x-device-id") ||
    "tank-01";
  req.device = { deviceId };

  next();
}