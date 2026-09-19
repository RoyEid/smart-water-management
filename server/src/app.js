import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { getSocketServer } from "./realtime/socketServer.js";
import authRoutes from "./routes/authRoutes.js";
import sensorRoutes from "./routes/sensorRoutes.js";
import deviceControlRoutes from "./routes/deviceControlRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import passport from "./config/passport.js";

const app = express();

if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.disable("x-powered-by");

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

// CSRF / Origin protection for state-changing HTTP requests
app.use((req, res, next) => {
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (stateChangingMethods.includes(req.method)) {
    const origin = req.get("Origin");
    const referer = req.get("Referer");

    if (origin && origin !== frontendUrl) {
      const error = new Error("CORS policy block: Unauthorized request origin.");
      error.statusCode = 403;
      return next(error);
    }

    if (!origin && referer && !referer.startsWith(frontendUrl)) {
      const error = new Error("CORS policy block: Unauthorized referrer.");
      error.statusCode = 403;
      return next(error);
    }
  }

  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    databaseConnected: mongoose.connection.readyState === 1,
    socketReady: Boolean(getSocketServer()),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/device/control", deviceControlRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/alerts", alertRoutes);

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Central error handler
app.use(errorHandler);

export default app;