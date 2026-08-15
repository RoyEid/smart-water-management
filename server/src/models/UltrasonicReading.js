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

    // YF-S201 binary flow presence detection (true = flow, false = no flow, null = missing/waiting).
    waterFlowDetected: { type: Boolean, default: null },

    // Electricity source detection (DAWLE = government electricity, MOTEUR = generator / no Dawle signal).
    powerSource: { type: String, enum: ["DAWLE", "MOTEUR"], default: "MOTEUR" },
    allowPumpOnMoteur: { type: Boolean, default: false },

    receivedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false }
);

// Serves "latest reading for this device" without a collection scan.
ultrasonicReadingSchema.index({ deviceId: 1, receivedAt: -1 });

export default mongoose.model("UltrasonicReading", ultrasonicReadingSchema);
