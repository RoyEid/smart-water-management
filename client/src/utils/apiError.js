/**
 * Turns any axios failure into a sentence worth showing a user.
 *
 * Three cases have to be distinguished, because they need different wording:
 * the backend answered with a message, the backend was unreachable, or the
 * request was cancelled. A raw axios message ("Network Error", "Request failed
 * with status code 500") is never shown, and neither is a stack.
 */
export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  // Request cancelled by a newer one — not a real failure.
  if (error.code === "ERR_CANCELED") return "";

  const data = error.response?.data;

  // Field-level validation detail reads better than the generic wrapper.
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (typeof first === "string" && first.trim()) return first;
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (!error.response) {
    return "Cannot reach the server. Check that the backend is running and try again.";
  }

  const status = error.response.status;
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That resource could not be found.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "The server ran into a problem. Please try again shortly.";

  return fallback;
}

/**
 * Field-level errors keyed by field name, for forms that highlight inputs
 * rather than showing one banner.
 */
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors;
  return errors && typeof errors === "object" ? errors : {};
}

export function isUnauthorized(error) {
  return error?.response?.status === 401;
}

export function isForbidden(error) {
  return error?.response?.status === 403;
}
