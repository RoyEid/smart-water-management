import mongoose from "mongoose";

/**
 * Registry of every device that has ever reported telemetry.
 *
 * Rows are created lazily by the telemetry pipeline, so no manual provisioning
 * step is needed and the current single device (tank-01) appears automatically.
 * The schema is already multi-device: nothing here assumes one row.
 */
const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // Owner-editable label. Falls back to the deviceId in the UI when empty.
    displayName: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },
    // Only set when a device actually reports it. The current ultrasonic
    // firmware does not send a version, so this stays null and the UI shows
    // "Not reported" instead of inventing a number.
    firmwareVersion: {
      type: String,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
      index: true,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    totalReadings: {
      type: Number,
      default: 0,
    },
    // The device owner.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // Timestamp when current owner was assigned. Used for historical privacy isolation.
    ownerAssignedAt: {
      type: Date,
      default: null,
      index: true,
    },
    // One-time physical pairing code for secure ownership claiming of newly reporting hardware
    claimCode: {
      type: String,
      default: null,
      trim: true,
    },
    claimCodeHash: {
      type: String,
      default: null,
      trim: true,
    },
    // Physical tank configuration (configured by device owner)
    tanks: {
      upper: {
        capacityLiters: { type: Number, default: null },
        heightCm: { type: Number, default: null },
      },
      lower: {
        capacityLiters: { type: Number, default: null },
        heightCm: { type: Number, default: null },
      },
      configuredAt: { type: Date, default: null },
      configuredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Device", deviceSchema);
