import mongoose from "mongoose";

/**
 * Durable copy of the pump control state.
 *
 * The authoritative copy stays in memory (the ESP32 polls it every 2 s and must
 * never wait on Mongo), this document only survives a backend restart so the
 * system does not silently jump back to AUTO / enabled while a technician has
 * deliberately disabled it. The stored values and their meanings are exactly
 * the ones the existing control endpoint already used — no contract change.
 */
const deviceControlStateSchema = new mongoose.Schema(
  {
    // One row per device. Defaults to the current single device so existing
    // deployments keep working without a migration step.
    deviceId: {
      type: String,
      required: true,
      unique: true,
      default: "tank-01",
    },
    systemEnabled: { type: Boolean, default: true },
    pumpMode: { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },
    manualPumpState: { type: String, enum: ["ON", "OFF"], default: "OFF" },
    allowPumpOnMoteur: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model("DeviceControlState", deviceControlStateSchema);
