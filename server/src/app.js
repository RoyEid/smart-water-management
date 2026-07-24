import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import sensorRoutes from "./routes/sensorRoutes.js";
import deviceControlRoutes from "./routes/deviceControlRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import passport from "./config/passport.js";

const app = express();

// Trust proxy for secure cookies behind reverse proxies (like Heroku, Nginx, etc.)
// Usually 1 or true, adjust as needed. Configured via env.
if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// 1. Helmet for secure headers
app.use(helmet());

// 2. Disable x-powered-by header (double safety)
app.disable("x-powered-by");

// 3. CORS configuration
const frontendUrl =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:5173";
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// 4. Strict Origin Checking for state-changing requests (CSRF Protection)
app.use((req, res, next) => {
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (stateChangingMethods.includes(req.method)) {
    const origin = req.get("Origin");
    const referer = req.get("Referer");

    // If Origin is present, verify it matches the configured frontend.
    if (origin && origin !== frontendUrl) {
      const error = new Error("CORS policy block: Unauthorized request origin.");
      error.statusCode = 403;
      return next(error);
    }

    // If Referer is present (and Origin wasn't), verify the frontend origin.
    if (!origin && referer && !referer.startsWith(frontendUrl)) {
      const error = new Error("CORS policy block: Unauthorized referrer.");
      error.statusCode = 403;
      return next(error);
    }
  }
  next();
});

// 5. Parse request bodies with size limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 6. Cookie Parser
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/device/control", deviceControlRoutes);

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Centralized error handler
app.use(errorHandler);

export default app;
