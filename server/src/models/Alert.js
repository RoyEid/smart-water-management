import mongoose from "mongoose";

export const ALERT_SEVERITIES = ["info", "warning", "critical"];

/**
 * Codes are stable identifiers, not display strings, so deduplication and the
 * client-side translation lookup both key off something that never changes
 * when the wording does.
 */
export const ALERT_CODES = {
  DEVICE_OFFLINE: "DEVICE_OFFLINE",
  UPPER_SENSOR_ERROR: "UPPER_SENSOR_ERROR",
  LOWER_SENSOR_ERROR: "LOWER_SENSOR_ERROR",
  LOWER_TANK_CRITICAL: "LOWER_TANK_CRITICAL",
  PUMP_BLOCKED: "PUMP_BLOCKED",
  UPPER_TANK_FULL: "UPPER_TANK_FULL",
  SYSTEM_DISABLED: "SYSTEM_DISABLED",
  INVALID_TELEMETRY: "INVALID_TELEMETRY",
};

const alertSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    code: {
      type: String,
      required: true,
      enum: Object.values(ALERT_CODES),
    },
    severity: {
      type: String,
      required: true,
      enum: ALERT_SEVERITIES,
      default: "warning",
    },
    // Human-readable snapshot of the condition at the time it was raised.
    // Stored so the history stays truthful even if thresholds change later.
    message: { type: String, required: true },
    // Structured values behind the message (levels, thresholds). Never secrets.
    context: { type: mongoose.Schema.Types.Mixed, default: {} },

    isRead: { type: Boolean, default: false, index: true },
    // An alert is "active" from the moment the condition starts until it clears.
    // Deduplication keys off (deviceId, code, isResolved: false), so a condition
    // that persists for an hour is one row whose occurrences counter grows —
    // not 1800 rows, one per telemetry cycle.
    isResolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date, default: null },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    occurrences: { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false }
);

// The dedup lookup: "is this condition already open for this device?"
alertSchema.index({ deviceId: 1, code: 1, isResolved: 1 });
// The list query: newest first, optionally filtered by resolved/read state.
alertSchema.index({ lastSeenAt: -1 });

export default mongoose.model("Alert", alertSchema);
