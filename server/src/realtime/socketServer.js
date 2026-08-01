import { Server } from "socket.io";

let io = null;

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  );
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

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Dashboard connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Dashboard disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function emitUltrasonicReading(reading) {
  // A missing Socket.IO server must not turn a valid device reading into a
  // 500 for the ESP32 — the reading is already stored either way.
  if (!io) {
    console.error(
      "[Socket.IO] Cannot broadcast reading: server was never attached to the HTTP server."
    );
    return;
  }

  io.emit("ultrasonic:update", reading);
}

export function emitDeviceControlChanged(controlState) {
  if (!io) {
    console.error(
      "[Socket.IO] Cannot broadcast control state: server was never attached to the HTTP server."
    );
    return;
  }

  io.emit("control:update", controlState);
  io.emit("device-control-changed", controlState);
}

export function emitAlertCreated(alert) {
  if (!io) return;
  io.emit("alert:new", serializeAlert(alert));
}

export function emitAlertResolved(payload) {
  if (!io) return;
  io.emit("alert:resolved", payload);
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
