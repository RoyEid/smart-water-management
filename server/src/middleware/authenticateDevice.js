import crypto from "crypto";

function hashKey(value) {
  return crypto.createHash("sha256").update(value).digest();
}

export default function authenticateDevice(req, res, next) {
  const configuredKey = process.env.DEVICE_API_KEY;

  if (!configuredKey) {
    const error = new Error("Device API authentication is not configured.");
    error.statusCode = 500;
    return next(error);
  }

  const providedKey = req.get("x-device-key");
  const isValid =
    typeof providedKey === "string" &&
    crypto.timingSafeEqual(hashKey(providedKey), hashKey(configuredKey));

  if (!isValid) {
    const error = new Error("Invalid device API key.");
    error.statusCode = 401;
    return next(error);
  }

  next();
}
