import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Device from "../models/Device.js";

let io = null;

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  );
}

function parseCookieToken(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function attachSocketServer(httpServer) {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: getFrontendUrl(),
      methods: ["GET", "POST", "PUT"],
      credentials: true,
    },
  });

  // Authenticate socket connections from the session cookie
  io.use(async (socket, next) => {
    try {
      const token = parseCookieToken(socket.handshake.headers.cookie);
      if (!token) {
        socket.user = null;
        return next();
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) return next();

      const decoded = jwt.verify(token, secret);
      if (decoded?.userId) {
        const user = await User.findById(decoded.userId).select("_id role isActive").lean();
        if (user && user.isActive !== false) {
          socket.user = { _id: String(user._id), role: user.role };
        }
      }
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on("connection", async (socket) => {
    if (socket.user?.role === "admin") {
      socket.join("admins");
      console.log(`[Socket.IO] Admin connected: ${socket.id} (user=${socket.user._id})`);
    } else if (socket.user?.role === "user") {
      socket.join(`user:${socket.user._id}`);
      const ownedDevices = await Device.find({ owner: socket.user._id }).distinct("deviceId");
      ownedDevices.forEach((deviceId) => socket.join(`device:${deviceId}`));
      console.log(
        `[Socket.IO] User connected: ${socket.id} (user=${socket.user._id}, devices=${ownedDevices.join(",") || "none"})`
      );
    } else {
      console.log(`[Socket.IO] Anonymous connected: ${socket.id}`);
    }

    socket.on("subscribe:device", async (deviceId) => {
      if (!deviceId) return;
      if (socket.user?.role === "admin") {
        socket.join(`device:${deviceId}`);
      } else if (socket.user?.role === "user") {
        const owned = await Device.findOne({ deviceId, owner: socket.user._id });
        if (owned) {
          socket.join(`device:${deviceId}`);
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Dashboard disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function emitUltrasonicReading(reading) {
  if (!io) {
    console.error(
      "[Socket.IO] Cannot broadcast reading: server was never attached to the HTTP server."
    );
    return;
  }

  // Room-isolated emission: only admins and authorized device subscribers receive the stream
  io.to("admins").to(`device:${reading.deviceId}`).emit("ultrasonic:update", reading);
}

export function emitDeviceControlChanged(controlState) {
  if (!io) {
    console.error(
      "[Socket.IO] Cannot broadcast control state: server was never attached to the HTTP server."
    );
    return;
  }

  const targetDeviceId = controlState.deviceId;
  if (targetDeviceId) {
    io.to("admins").to(`device:${targetDeviceId}`).emit("control:update", controlState);
    io.to("admins").to(`device:${targetDeviceId}`).emit("device-control-changed", controlState);
  } else {
    io.to("admins").emit("control:update", controlState);
    io.to("admins").emit("device-control-changed", controlState);
  }
}

export function emitAlertCreated(alert) {
  if (!io) return;
  io.to("admins").to(`device:${alert.deviceId}`).emit("alert:new", serializeAlert(alert));
}

export function emitAlertResolved(payload) {
  if (!io) return;
  io.to("admins").to(`device:${payload.deviceId}`).emit("alert:resolved", payload);
}

/**
 * Alerts are broadcast in the same shape the REST list returns, so the client
 * can push a socket alert straight into the list it already rendered without a
 * second normalization path.
 */
function serializeAlert(alert) {
  return {
    id: String(alert._id ?? alert.id),
    deviceId: alert.deviceId,
    code: alert.code,
    severity: alert.severity,
    message: alert.message,
    context: alert.context ?? {},
    isRead: Boolean(alert.isRead),
    isResolved: Boolean(alert.isResolved),
    firstSeenAt: alert.firstSeenAt,
    lastSeenAt: alert.lastSeenAt,
    resolvedAt: alert.resolvedAt ?? null,
    occurrences: alert.occurrences ?? 1,
  };
}

export function getSocketServer() {
  return io;
}
