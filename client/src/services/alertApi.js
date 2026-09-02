import api from "./api";

export async function fetchAlerts(params) {
  const { data } = await api.get("/alerts", { params });
  return data;
}

export async function fetchRecentAlerts() {
  const { data } = await api.get("/alerts/recent");
  return data;
}

export async function markAlertRead(id) {
  const { data } = await api.patch(`/alerts/${id}/read`);
  return data;
}

export async function markAllAlertsRead() {
  const { data } = await api.patch("/alerts/read-all");
  return data;
}

export async function clearResolvedAlerts(params) {
  const { data } = await api.delete("/alerts/resolved", { params });
  return data;
}
