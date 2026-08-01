/**
 * Maps audit action codes to translation keys.
 *
 * The stored action is a stable identifier; the wording shown to an admin is a
 * translation of it. An unknown action falls back to its raw code rather than
 * rendering blank, so a newly added backend action is still legible.
 */
export const AUDIT_ACTION_KEYS = {
  LOGIN: "auditLogin",
  LOGOUT: "auditLogout",
  REGISTER: "auditRegister",
  ROLE_CHANGED: "auditRoleChanged",
  ACCOUNT_ENABLED: "auditAccountEnabled",
  ACCOUNT_DISABLED: "auditAccountDisabled",
  ACCOUNT_DELETED: "auditAccountDeleted",
  VERIFICATION_RESENT: "auditVerificationResent",
  PUMP_MODE_CHANGED: "auditPumpModeChanged",
  MANUAL_PUMP_COMMAND: "auditManualPumpCommand",
  SYSTEM_ENABLED: "auditSystemEnabled",
  SYSTEM_DISABLED: "auditSystemDisabled",
  DEVICE_RENAMED: "auditDeviceRenamed",
  SETTINGS_UPDATED: "auditSettingsUpdated",
  PASSWORD_CHANGED: "auditPasswordChanged",
  PROFILE_UPDATED: "auditProfileUpdated",
};

export function auditActionKey(action) {
  return AUDIT_ACTION_KEYS[action] ?? action;
}

/**
 * Renders the metadata object as a short, readable summary.
 *
 * The audit service already strips credential-shaped keys before storage, so
 * whatever arrives here is safe to display; this only keeps it compact.
 */
export function formatAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return "";
  const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== "");
  if (entries.length === 0) return "";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}
