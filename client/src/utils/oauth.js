/**
 * Helper to construct the backend OAuth redirect URL safely.
 * Supports VITE_API_URL configured with or without trailing `/api`.
 * 
 * @param {("google"|"github")} provider 
 * @returns {string}
 */
export function getOAuthUrl(provider) {
  const configuredUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  const cleanUrl = configuredUrl.replace(/\/+$/, "");

  const apiBase = cleanUrl.endsWith("/api")
    ? cleanUrl
    : `${cleanUrl}/api`;

  return `${apiBase}/auth/${provider}`;
}
