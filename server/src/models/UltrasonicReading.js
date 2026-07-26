import mongoose from "mongoose";

const TANK_STATUSES = [
  "Empty",
  "Low",
  "Normal",
  "High",
  "Full",
  "Sensor Error",
  "Offline",
];

const tankSchema = new mongoose.Schema(
  {
    distanceCm: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    waterHeightCm: { type: Number, default: 0 },
    tankStatus: { type: String, enum: TANK_STATUSES, default: "Normal" },
  },
  { _id: false }
);

const ultrasonicReadingSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },

    upperTank: { type: tankSchema, default: () => ({}) },
    lowerTank: { type: tankSchema, default: () => ({}) },

    pumpStatus: { type: String, enum: ["ON", "OFF"], default: "OFF" },
    pumpRunning: { type: Boolean, default: false },
    systemEnabled: { type: Boolean, default: true },
    pumpMode: { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },

    sensorStatus: { type: String, default: null },
    failedSensor: { type: String, default: null },

    // Optional YF-S201 flow telemetry.
    // Ultrasonic-only firmware does not send these, so they stay optional and
    // default to null — a null simply means "no flow data in this reading".
    flowRateLMin: { type: Number, default: null },
    totalTransferredLitres: { type: Number, default: null },
    // "simulated" | "measured" | null — which source produced the flow values.
    flowDataMode: { type: String, default: null },

    receivedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false }
);

// Serves "latest reading for this device" without a collection scan.
ultrasonicReadingSchema.index({ deviceId: 1, receivedAt: -1 });

export default mongoose.model("UltrasonicReading", ultrasonicReadingSchema);
