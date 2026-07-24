export default function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === "production";
  
  console.error("Error Caught in Global Handler:", {
    message: err.message,
    stack: isProduction ? "[Redacted]" : err.stack,
  });

  const statusCode = err.statusCode || err.status || 500;
  
  // Custom response structure
  const responsePayload = {
    message: err.message || "An unexpected error occurred. Please try again.",
  };

  // Include errors if it's a validation error or custom error with field details
  if (err.errors) {
    responsePayload.errors = err.errors;
  }

  if (!isProduction && err.stack) {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}
