import api from "./api";

export async function fetchDevices() {
  const { data } = await api.get("/devices");
  return data;
}

export async function fetchDevice(deviceId) {
  const { data } = await api.get(`/devices/${deviceId}`);
  return data;
}

export async function renameDevice(deviceId, displayName) {
  const { data } = await api.patch(`/devices/${deviceId}`, { displayName });
  return data;
}

export async function updateTankConfig(deviceId, tankConfig) {
  const { data } = await api.put(`/devices/${deviceId}/tanks`, tankConfig);
  return data;
}

export async function fetchTelemetryHistory(params) {
  const { data } = await api.get("/devices/telemetry/history", { params });
  return data;
}

/**
 * Fetches the CSV as a blob so the caller can trigger a download.
 *
 * A plain link would not carry the session cookie through the axios instance's
 * baseURL/credentials configuration, so the request goes through axios and the
 * resulting blob is handed to the browser.
 */
export async function exportTelemetryCsv(params) {
  const response = await api.get("/devices/telemetry/export", {
    params,
    responseType: "blob",
  });

  return {
    blob: response.data,
    rowCount: Number(response.headers["x-export-row-count"] ?? 0),
    truncated: response.headers["x-export-truncated"] === "true",
  };
}
