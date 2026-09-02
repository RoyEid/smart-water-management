import AuditLog from "../models/AuditLog.js";

// Second line of defence: even if a caller passes something it should not,
// anything whose key looks credential-shaped never reaches the database.
const FORBIDDEN_METADATA_KEYS = [
  "password",
  "newpassword",
  "currentpassword",
  "token",
  "resettoken",
  "codehash",
  "hash",
  "secret",
  "apikey",
  "devicekey",
  "authorization",
  "cookie",
];

export function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};

  const safe = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (FORBIDDEN_METADATA_KEYS.some((forbidden) => normalized.includes(forbidden))) {
      continue;
    }
    // Only primitives and short strings — no nested request objects.
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      safe[key] = typeof value === "string" ? value.slice(0, 300) : value;
    }
  }
  return safe;
}

/**
 * Client IP, best effort.
 *
 * Express only trusts X-Forwarded-For when `trust proxy` is enabled, so this
 * returns the real peer address in a direct deployment and the forwarded one
 * behind a configured reverse proxy — never a spoofable header value that the
 * app was not told to trust.
 */
function resolveIp(req) {
  if (!req) return null;
  const ip = req.ip || req.socket?.remoteAddress || null;
  if (!ip) return null;
  // Normalise the IPv4-mapped IPv6 form (::ffff:127.0.0.1) for readability.
  return ip.replace(/^::ffff:/, "").slice(0, 45);
}

/**
 * Records a device management or security-relevant action.
 *
 * Never throws and never blocks the caller: an audit write failing must not
 * turn a successful role change into a 500 for the user who made it. Failures
 * are logged so they are still visible.
 */
export function recordAudit({
  req = null,
  actor = null,
  action,
  targetType = "system",
  targetId = null,
  targetLabel = null,
  metadata = {},
}) {
  const resolvedActor = actor || req?.user || null;

  const entry = {
    actorId: resolvedActor?._id ?? null,
    actorEmail: resolvedActor?.email ?? null,
    actorRole: resolvedActor?.role ?? null,
    action,
    targetType,
    targetId: targetId ? String(targetId) : null,
    targetLabel: targetLabel ? String(targetLabel).slice(0, 200) : null,
    metadata: sanitizeMetadata(metadata),
    ip: resolveIp(req),
    createdAt: new Date(),
  };

  return AuditLog.create(entry).catch((error) => {
    console.error(`[Audit] Failed to record ${action}:`, error.message);
    return null;
  });
}

export default recordAudit;
