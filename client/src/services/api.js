import axios from "axios";

const configuredApiUrl =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

function toApiBaseUrl(url) {
  const origin = url.replace(/\/+$/, "");
  return origin.endsWith("/api") ? origin : `${origin}/api`;
}

const apiBaseUrl = toApiBaseUrl(configuredApiUrl);

const api = axios.create({
  baseURL: apiBaseUrl,

  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
