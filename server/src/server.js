import "./config/env.js";
import { createServer } from "node:http";
import app from "./app.js";
import connectDB from "./config/database.js";
import { attachSocketServer } from "./realtime/socketServer.js";

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
connectDB().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode at http://${HOST}:${PORT}`
    );
  });
}).catch((error) => {
  console.error("Failed to connect to database:", error);
  process.exit(1);
});
