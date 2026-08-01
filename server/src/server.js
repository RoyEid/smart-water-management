import "./config/env.js";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import app from "./app.js";
import connectDB from "./config/database.js";
import { attachSocketServer } from "./realtime/socketServer.js";
import {
  hydrateLatestReading,
  getLatestReading,
} from "./services/ultrasonicReadingService.js";
import { hydrateDeviceControlState } from "./services/deviceControlService.js";
import {
  hydrateOpenAlerts,
  sweepOfflineDevices,
} from "./services/alertService.js";

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
// A device that goes silent stops driving the alert evaluation, so the offline
// condition needs its own timer. 5 s is half the 10 s offline window, which is
// frequent enough to notice the transition promptly without polling hard.
const OFFLINE_SWEEP_INTERVAL_MS = 5_000;

connectDB()
  .then(() =>
    Promise.all([
      hydrateLatestReading(),
      hydrateDeviceControlState(),
      hydrateOpenAlerts(),
    ])
  )
  .then(() => {
    const offlineSweep = setInterval(() => {
      sweepOfflineDevices(getLatestReading).catch((error) => {
        console.error("[Alerts] Offline sweep failed:", error.message);
      });
    }, OFFLINE_SWEEP_INTERVAL_MS);

    // Lets the process exit on Ctrl-C instead of being held open by the timer.
    offlineSweep.unref?.();
  })
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
