import mongoose from "mongoose";

export const AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  ROLE_CHANGED: "ROLE_CHANGED",
  ACCOUNT_ENABLED: "ACCOUNT_ENABLED",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  VERIFICATION_RESENT: "VERIFICATION_RESENT",
  PUMP_MODE_CHANGED: "PUMP_MODE_CHANGED",
  MANUAL_PUMP_COMMAND: "MANUAL_PUMP_COMMAND",
  SYSTEM_ENABLED: "SYSTEM_ENABLED",
  SYSTEM_DISABLED: "SYSTEM_DISABLED",
  DEVICE_RENAMED: "DEVICE_RENAMED",
  TANK_CONFIG_UPDATED: "TANK_CONFIG_UPDATED",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
};

export const AUDIT_TARGET_TYPES = ["user", "device", "system", "account"];

const auditLogSchema = new mongoose.Schema(
  {
    // Null only for actions that genuinely have no authenticated actor.
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmail: { type: String, default: null },
    actorRole: { type: String, default: null },

    action: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_ACTIONS),
      index: true,
    },
    targetType: {
      type: String,
      enum: AUDIT_TARGET_TYPES,
      default: "system",
    },
    targetId: { type: String, default: null },
    targetLabel: { type: String, default: null },

    // Free-form detail (old/new role, pump mode, device name...). Callers are
    // responsible for passing no secrets; the audit service also strips any
    // key that looks like a credential as a second line of defence.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    ip: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// The admin activity list is always "newest first", usually filtered by action.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
