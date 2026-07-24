import api from "./api";

export async function fetchLatestUltrasonicReading() {
  const response = await api.get("/sensors/ultrasonic/latest");
  return response.data.reading === null ? null : response.data;
}
