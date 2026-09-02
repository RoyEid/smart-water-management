import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Device from "../models/Device.js";
import DeviceMember from "../models/DeviceMember.js";

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
      if (!secret) {
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, secret);
      const userId = decoded?.userId || decoded?.id;
      if (userId) {
        const user = await User.findById(userId).select("isActive").lean();
        if (user && user.isActive !== false) {
          socket.user = { _id: String(user._id) };
        } else {
          socket.user = null;
        }
      } else {
        socket.user = null;
      }
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on("connection", async (socket) => {
    if (socket.user?._id) {
      socket.join(`user:${socket.user._id}`);
      const accessibleDevices = await DeviceMember.find({ user: socket.user._id }).distinct("deviceId");
      accessibleDevices.forEach((deviceId) => socket.join(`device:${deviceId}`));
      console.log(
        `[Socket.IO] User connected: ${socket.id} (user=${socket.user._id}, devices=${accessibleDevices.join(",") || "none"})`
      );
    } else {
      console.log(`[Socket.IO] Anonymous connected: ${socket.id}`);
    }

    socket.on("subscribe:device", async (deviceId) => {
      if (!deviceId || !socket.user?._id) return;
      const member = await DeviceMember.findOne({ deviceId, user: socket.user._id });
      const isOwner = !member ? await Device.findOne({ deviceId, owner: socket.user._id }) : null;
      if (member || isOwner) {
        socket.join(`device:${deviceId}`);
        console.log(`[Socket.IO] User socket ${socket.id} subscribed to device:${deviceId}`);
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

  // Room-isolated emission: authorized device subscribers receive the stream
  io.to(`device:${reading.deviceId}`).emit("ultrasonic:update", reading);
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
    io.to(`device:${targetDeviceId}`).emit("control:update", controlState);
    io.to(`device:${targetDeviceId}`).emit("device-control-changed", controlState);
  }
}

export function emitAlertCreated(alert) {
  if (!io) return;
  io.to(`device:${alert.deviceId}`).emit("alert:new", serializeAlert(alert));
}

export function emitAlertResolved(payload) {
  if (!io) return;
  io.to(`device:${payload.deviceId}`).emit("alert:resolved", payload);
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
