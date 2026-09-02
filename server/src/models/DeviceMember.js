import mongoose from "mongoose";

export const DEVICE_ROLES = ["admin", "controller", "viewer"];

const deviceMemberSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: [...DEVICE_ROLES, "owner"], // "owner" retained for database compatibility during migration
      required: true,
      default: "viewer",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
  },
  { timestamps: true, versionKey: false }
);

// Prevent duplicate membership for the same user on the same device
deviceMemberSchema.index({ deviceId: 1, user: 1 }, { unique: true });
deviceMemberSchema.index({ user: 1, deviceId: 1 });

const DeviceMember = mongoose.model("DeviceMember", deviceMemberSchema);

export default DeviceMember;
