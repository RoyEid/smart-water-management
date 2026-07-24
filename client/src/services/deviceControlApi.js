import api from "./api";

export async function fetchDeviceControlState() {
  const res = await api.get("/device/control");
  return res.data;
}

export async function updateDeviceControlState(payload) {
  console.log("[CONTROL] Button clicked", payload);
  const url = "/device/control";
  console.log("[CONTROL] Sending request", {
    method: "PUT",
    url,
    payload,
  });
  try {
    const response = await api.put(url, payload);
    console.log("[CONTROL] Success", response.data);
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
