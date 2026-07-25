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

export function getSocketServer() {
  return io;
}
