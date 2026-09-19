export default function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === "production";
  const statusCode = err.statusCode || err.status || 500;

  // Client mistakes (400/401/403/404/409) are normal traffic and would drown
  // the log; only genuine server faults get a full stack.
  if (statusCode >= 500) {
    console.error("[Error]", req.method, req.originalUrl, {
      message: err.message,
      stack: isProduction ? "[Redacted]" : err.stack,
    });
  } else {
    console.warn(
      `[Error] ${statusCode} ${req.method} ${req.originalUrl}: ${err.message}`
    );
  }

  // A 500's real message can carry internals (driver errors, file paths), so
  // in production it is replaced with a generic line. Deliberate errors below
  // 500 were written for the user and are passed through unchanged.
  const message =
    statusCode >= 500 && isProduction
      ? "An unexpected error occurred. Please try again."
      : err.message || "An unexpected error occurred. Please try again.";

  const responsePayload = {
    success: false,
    message,
  };

  // Field-level validation detail, when the thrower attached any.
  if (err.errors) {
    responsePayload.errors = err.errors;
  }

  if (!isProduction && err.stack) {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}
