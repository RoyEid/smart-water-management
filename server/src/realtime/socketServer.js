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
  if (!io) {
    throw new Error("Socket.IO server has not been attached to the HTTP server.");
  }

  io.emit("ultrasonic:update", reading);
}

export function emitDeviceControlChanged(controlState) {
  if (!io) {
    throw new Error("Socket.IO server has not been attached to the HTTP server.");
  }

  io.emit("control:update", controlState);
  io.emit("device-control-changed", controlState);
}

export function getSocketServer() {
  return io;
}
