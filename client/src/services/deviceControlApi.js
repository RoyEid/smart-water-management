import api from "./api";

export async function fetchDeviceControlState() {
  const res = await api.get("/device/control");
  return res.data;
}

export async function updateDeviceControlState(payload) {
  const url = "/device/control";

  try {
    const response = await api.put(url, payload);
    return response.data;
  } catch (error) {
    console.error("[CONTROL] Request failed", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}
