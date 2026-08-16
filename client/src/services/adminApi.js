import api from "./api";

export async function fetchAdminOverview() {
  const { data } = await api.get("/admin/overview");
  return data;
}

export async function fetchAdminUsers(params) {
  const { data } = await api.get("/admin/users", { params });
  return data;
}

export async function fetchAdminUser(id) {
  const { data } = await api.get(`/admin/users/${id}`);
  return data;
}

export async function updateUserRole(id, role) {
  const { data } = await api.patch(`/admin/users/${id}/role`, { role });
  return data;
}

export async function updateUserStatus(id, isActive) {
  const { data } = await api.patch(`/admin/users/${id}/status`, { isActive });
  return data;
}

export async function deleteUser(id) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}

export async function resendUserVerification(id) {
  const { data } = await api.post(`/admin/users/${id}/resend-verification`);
  return data;
}

export async function fetchAuditLog(params) {
  const { data } = await api.get("/admin/audit-log", { params });
  return data;
}

export async function fetchTelemetryStats() {
  const { data } = await api.get("/admin/telemetry-stats");
  return data;
}

export async function fetchSystemConfig() {
  const { data } = await api.get("/admin/config");
  return data;
}

export async function assignDeviceOwner(deviceId, userId) {
  const { data } = await api.patch(`/admin/devices/${deviceId}/assign`, { userId });
  return data;
}
