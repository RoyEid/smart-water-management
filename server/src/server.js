import "./config/env.js";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import app from "./app.js";
import connectDB from "./config/database.js";
import { attachSocketServer } from "./realtime/socketServer.js";
import { hydrateLatestReading } from "./services/ultrasonicReadingService.js";

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

const server = createServer(app);
attachSocketServer(server);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `[Startup] Port ${PORT} is already in use. ` +
      `Run "netstat -ano | findstr :${PORT}", identify the listening PID, ` +
      `then stop only that process with "taskkill /PID <PID> /F".`
    );
    process.exit(1);
  }

  console.error("[Startup] HTTP server failed:", error);
  process.exit(1);
});

// Connect to Database first
connectDB()
  .then(() => hydrateLatestReading())
  .then(() => {
    // 0.0.0.0 binds every interface, which is what lets the ESP32 reach the
    // backend over the LAN IP. Binding 127.0.0.1 would make it localhost-only.
    server.listen(PORT, HOST, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV || "development"} mode at http://${HOST}:${PORT}`
      );
      console.log(
        `[Startup] Point the ESP32 at http://<laptop-lan-ip>:${PORT}/api/sensors/ultrasonic`
      );

      for (const [name, addresses] of Object.entries(networkInterfaces())) {
        for (const address of addresses ?? []) {
          if (address.family === "IPv4" && !address.internal) {
            console.log(`[Startup]   ${name}: http://${address.address}:${PORT}`);
          }
        }
      }
    });
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  });
