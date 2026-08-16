import api from "./api";

export async function fetchLatestUltrasonicReading(deviceId) {
  const params = deviceId ? { deviceId } : undefined;
  const response = await api.get("/sensors/ultrasonic/latest", { params });
  if (!response.data || response.data.reading === null) return null;
  return response.data;
}
