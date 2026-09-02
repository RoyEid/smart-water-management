// ---------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------

// Express is the web framework used to create the API.
import express from "express";

// Mongoose connects the application to MongoDB
// and gives access to the current database connection state.
import mongoose from "mongoose";

// CORS controls which frontend is allowed
// to send requests to this backend.
import cors from "cors";

// Parses cookies sent by the browser.
import cookieParser from "cookie-parser";

// Helmet improves security by adding secure HTTP headers.
import helmet from "helmet";

// Used to check whether the Socket.IO server
// has already been initialized.
import { getSocketServer } from "./realtime/socketServer.js";

// Import the different API route groups.
import authRoutes from "./routes/authRoutes.js";
import sensorRoutes from "./routes/sensorRoutes.js";
import deviceControlRoutes from "./routes/deviceControlRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";

// Central error-handling middleware.
import errorHandler from "./middleware/errorHandler.js";

// Passport handles authentication strategies
// such as Google/GitHub OAuth.
import passport from "./config/passport.js";


// ---------------------------------------------------------
// CREATE EXPRESS APPLICATION
// ---------------------------------------------------------

// Create the Express application.
//
// "app" will contain:
// - middleware
// - routes
// - error handling
const app = express();


// ---------------------------------------------------------
// TRUST PROXY
// ---------------------------------------------------------

// When the backend is deployed behind a reverse proxy
// such as Nginx, Render, Heroku, etc.,
// Express may need to trust that proxy.
//
// The setting is controlled from .env.
if (
  process.env.TRUST_PROXY === "true" ||
  process.env.TRUST_PROXY === "1"
) {
  app.set("trust proxy", 1);
}


// ---------------------------------------------------------
// SECURITY MIDDLEWARE
// ---------------------------------------------------------

// Helmet adds security-related HTTP headers.
//
// Example:
// protection against some browser-based attacks.
app.use(helmet());


// Express normally sends:
//
// X-Powered-By: Express
//
// We remove it so the server does not unnecessarily
// reveal that it is using Express.
app.disable("x-powered-by");


// ---------------------------------------------------------
// CORS CONFIGURATION
// ---------------------------------------------------------

// Decide which frontend URL is allowed to access the backend.
//
// Priority:
//
// 1. FRONTEND_URL
// 2. CLIENT_URL
// 3. localhost:5173
const frontendUrl =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:5173";


// Enable CORS.
//
// origin:
// only allow requests from the configured frontend.
//
// credentials: true
// allows cookies/authentication credentials
// to be sent between frontend and backend.
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);


// ---------------------------------------------------------
// CSRF / ORIGIN PROTECTION
// ---------------------------------------------------------

// This middleware checks requests that can modify data.
//
// Examples:
// POST
// PUT
// PATCH
// DELETE
//
// GET requests are not checked here because they
// normally only retrieve information.
app.use((req, res, next) => {

  // List of HTTP methods that can change server data.
  const stateChangingMethods = [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ];


  // Only perform the security check
  // if this is a state-changing request.
  if (stateChangingMethods.includes(req.method)) {

    // Read the Origin header.
    //
    // Example:
    // http://localhost:5173
    const origin = req.get("Origin");

    // Read the Referer header.
    const referer = req.get("Referer");


    // -----------------------------------------------------
    // CHECK ORIGIN
    // -----------------------------------------------------

    // If the request contains an Origin header,
    // make sure it matches the allowed frontend URL.
    if (origin && origin !== frontendUrl) {

      const error = new Error(
        "CORS policy block: Unauthorized request origin."
      );

      // HTTP 403 = Forbidden
      error.statusCode = 403;

      // Send the error to the centralized error handler.
      return next(error);
    }


    // -----------------------------------------------------
    // CHECK REFERER
    // -----------------------------------------------------

    // If Origin is missing but Referer exists,
    // verify that the Referer begins with frontendUrl.
    if (
      !origin &&
      referer &&
      !referer.startsWith(frontendUrl)
    ) {

      const error = new Error(
        "CORS policy block: Unauthorized referrer."
      );

      error.statusCode = 403;

      return next(error);
    }
  }


  // Continue to the next middleware or route.
  next();
});


// ---------------------------------------------------------
// BODY PARSING
// ---------------------------------------------------------

// Parse incoming JSON request bodies.
//
// Example request:
//
// {
//   "email": "user@email.com",
//   "password": "123456"
// }
//
// Maximum size allowed = 2 MB.
app.use(
  express.json({
    limit: "2mb",
  })
);


// Parse URL-encoded form data.
//
// extended: true
// allows nested objects in form data.
//
// Example:
//
// user[name]=Roy
app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  })
);


// ---------------------------------------------------------
// COOKIE PARSER
// ---------------------------------------------------------

// Parses cookies from incoming requests.
//
// Example:
//
// req.cookies.token
app.use(cookieParser());


// ---------------------------------------------------------
// PASSPORT AUTHENTICATION
// ---------------------------------------------------------

// Initialize Passport.
//
// This prepares authentication strategies
// such as OAuth login.
app.use(passport.initialize());


// ---------------------------------------------------------
// HEALTH CHECK ROUTE
// ---------------------------------------------------------

// GET /api/health
//
// Used to quickly verify whether the backend,
// database, and Socket.IO are working.
app.get("/api/health", (req, res) => {

  // mongoose.connection.readyState === 1
  // means MongoDB is connected.
  const databaseConnected =
    mongoose.connection.readyState === 1;


  // getSocketServer() returns the Socket.IO instance.
  //
  // Boolean(...) converts the value into true/false.
  const socketReady =
    Boolean(getSocketServer());


  // Send successful HTTP response.
  //
  // HTTP 200 = OK
  res.status(200).json({
    success: true,
    status: "ok",

    // Is MongoDB connected?
    databaseConnected,

    // Is Socket.IO ready?
    socketReady,

    // Current server time.
    timestamp: new Date().toISOString(),
  });
});


// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------

// Authentication routes.
//
// Example:
//
// /api/auth/login
// /api/auth/register
// /api/auth/logout
app.use(
  "/api/auth",
  authRoutes
);


// Sensor / telemetry routes.
//
// ESP32 uses these routes
// to send ultrasonic and device telemetry.
//
// Example:
//
// POST /api/sensors/ultrasonic
app.use(
  "/api/sensors",
  sensorRoutes
);


// Device control routes.
//
// IMPORTANT:
//
// This uses the SINGULAR path:
//
// /api/device/control
//
// because the ESP32 firmware already polls this exact URL.
//
// Example:
//
// GET /api/device/control
//
// The path should not be changed casually
// because it would break the ESP32 firmware.
app.use(
  "/api/device/control",
  deviceControlRoutes
);


// General device-management routes.
//
// This uses the PLURAL path:
//
// /api/devices
//
// Example:
//
// GET /api/devices
// GET /api/devices/:id
// PATCH /api/devices/:id
app.use(
  "/api/devices",
  deviceRoutes
);


// Alert routes.
//
// Example:
//
// GET /api/alerts
// PATCH /api/alerts/:id/read
app.use(
  "/api/alerts",
  alertRoutes
);




// ---------------------------------------------------------
// 404 HANDLER
// ---------------------------------------------------------

// If no route above matched the request,
// execution reaches this middleware.
app.use((req, res, next) => {

  // Create an error containing
  // the requested URL.
  const error = new Error(
    `Route not found: ${req.originalUrl}`
  );

  // HTTP 404 = Not Found
  error.statusCode = 404;

  // Send the error to the central error handler.
  next(error);
});


// ---------------------------------------------------------
// CENTRALIZED ERROR HANDLER
// ---------------------------------------------------------

// This should stay LAST.
//
// Any error passed using:
//
// next(error)
//
// eventually reaches this middleware.
app.use(errorHandler);


// ---------------------------------------------------------
// EXPORT EXPRESS APP
// ---------------------------------------------------------

// Export app so server.js can use it:
//
// const server = createServer(app);
export default app;