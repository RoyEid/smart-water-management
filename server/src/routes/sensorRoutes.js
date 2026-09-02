// ---------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------

// Router lets us create a separate group of routes
// instead of putting every API route directly inside app.js.
import { Router } from "express";

// express-rate-limit protects the backend from receiving
// too many requests in a short period of time.
import rateLimit from "express-rate-limit";

// Zod is used to validate incoming request data.
import { z } from "zod";

// Controller functions for sensor telemetry.
//
// receiveUltrasonicReading:
// handles POST telemetry sent by the ESP32.
//
// getLatestUltrasonicReading:
// returns the latest reading to an authenticated user.
import {
  getLatestUltrasonicReading,
  receiveUltrasonicReading,
} from "../controllers/sensorController.js";

// Authenticates normal logged-in users.
import authenticate from "../middleware/authenticate.js";

// Authenticates physical ESP32 devices,
// usually using a device key/header.
import authenticateDevice from "../middleware/authenticateDevice.js";

// Validates request data against a Zod schema.
import validateRequest from "../middleware/validateRequest.js";


// ---------------------------------------------------------
// CREATE ROUTER
// ---------------------------------------------------------

// Create an Express Router instance.
//
// Later this router is mounted in app.js at:
//
// /api/sensors
const router = Router();


// ---------------------------------------------------------
// TANK DATA VALIDATION SCHEMA
// ---------------------------------------------------------

// Define the expected structure of one tank reading.
//
// This schema is reused for both:
// - upperTank
// - lowerTank
export const tankDataSchema = z.object({

  // Distance measured by the ultrasonic sensor in centimeters.
  //
  // Must:
  // - be a number
  // - be finite
  // - not be negative
  // - not exceed 400 cm
  distanceCm: z
    .number({
      invalid_type_error: "distanceCm must be a number.",
    })
    .finite("distanceCm must be a finite number.")
    .min(0, "distanceCm cannot be negative.")
    .max(400, "distanceCm must be at most 400 cm."),


  // Calculated tank percentage.
  //
  // Example:
  // 0   = empty
  // 50  = half full
  // 100 = full
  percentage: z
    .number({
      invalid_type_error: "percentage must be a number.",
    })
    .finite("percentage must be a finite number.")
    .min(0, "percentage must be between 0 and 100.")
    .max(100, "percentage must be between 0 and 100."),


  // Calculated water height inside the tank.
  waterHeightCm: z
    .number({
      invalid_type_error: "waterHeightCm must be a number.",
    })
    .finite("waterHeightCm must be a finite number.")
    .min(0, "waterHeightCm cannot be negative.")
    .max(
      5000,
      "waterHeightCm must not exceed 5000 cm."
    ),


  // Tank status must be one of these exact values.
  //
  // Example:
  // Empty
  // Low
  // Normal
  // High
  // Full
  // Sensor Error
  tankStatus: z.enum(
    [
      "Empty",
      "Low",
      "Normal",
      "High",
      "Full",
      "Sensor Error",
    ],
    {
      errorMap: () => ({
        message:
          "tankStatus must be Empty, Low, Normal, High, Full, or Sensor Error.",
      }),
    }
  ),
});


// ---------------------------------------------------------
// COMPLETE ESP32 TELEMETRY SCHEMA
// ---------------------------------------------------------

// This describes the complete data packet
// that the ESP32 is allowed to send.
//
// validateRequest() will reject the request
// if the incoming body does not match this schema.
export const ultrasonicReadingSchema = z.object({

  // Unique hardware/device identifier.
  //
  // Example:
  // swm-1C047B9205D4
  deviceId: z
    .string()
    .trim()
    .min(
      1,
      "deviceId must be a non-empty string."
    ),


  // Upper tank telemetry.
  //
  // optional() means the field is not required.
  upperTank: tankDataSchema.optional(),


  // Lower tank telemetry.
  lowerTank: tankDataSchema.optional(),


  // Current pump state.
  //
  // Only ON or OFF is accepted.
  //
  // If omitted, default is OFF.
  pumpStatus: z
    .enum(["ON", "OFF"], {
      errorMap: () => ({
        message: "pumpStatus must be ON or OFF.",
      }),
    })
    .default("OFF"),


  // Whether the overall system is enabled.
  systemEnabled: z
    .boolean()
    .optional(),


  // Current pump operating mode.
  //
  // AUTO:
  // ESP32 decides based on tank levels and safety.
  //
  // MANUAL:
  // user requests pump ON/OFF,
  // but ESP32 safety rules still apply.
  pumpMode: z
    .enum(["AUTO", "MANUAL"])
    .optional(),


  // General sensor status information.
  sensorStatus: z
    .string()
    .optional(),


  // If a sensor failed,
  // this can identify which one.
  failedSensor: z
    .string()
    .optional(),


  // -------------------------------------------------------
  // YF-S201 FLOW SENSOR
  // -------------------------------------------------------

  // Binary flow detection.
  //
  // true  = water flow detected
  // false = no flow detected
  // null  = unknown/not available
  //
  // In the current architecture this is monitoring telemetry.
  waterFlowDetected: z
    .boolean()
    .nullable()
    .optional(),


  // -------------------------------------------------------
  // ELECTRICITY SOURCE
  // -------------------------------------------------------

  // Power-source classification from the ZMPT101B.
  //
  // DAWLE  = government electricity
  // MOTEUR = generator
  powerSource: z
    .enum(["DAWLE", "MOTEUR"])
    .optional(),


  // Determines whether the pump is allowed
  // to operate while electricity source is MOTEUR.
  allowPumpOnMoteur: z
    .boolean()
    .optional(),


  // -------------------------------------------------------
  // OLD SINGLE-TANK COMPATIBILITY FIELDS
  // -------------------------------------------------------

  // These fields are kept so older firmware
  // that sends only one tank reading can still work.
  //
  // Newer firmware uses:
  //
  // upperTank
  // lowerTank
  distanceCm: z
    .number()
    .finite()
    .min(0)
    .max(400)
    .optional(),

  percentage: z
    .number()
    .finite()
    .min(0)
    .max(100)
    .optional(),

  waterHeightCm: z
    .number()
    .finite()
    .min(0)
    .max(5000)
    .optional(),

  tankStatus: z
    .enum([
      "Empty",
      "Low",
      "Normal",
      "High",
      "Full",
      "Sensor Error",
    ])
    .optional(),
});


// ---------------------------------------------------------
// SENSOR RATE LIMITER
// ---------------------------------------------------------

// Protect the backend from receiving
// too many telemetry requests.
//
// windowMs:
// 60 * 1000 = 60,000 ms = 1 minute
//
// max:
// maximum 180 requests per minute.
const deviceReadingLimiter = rateLimit({

  // Time window = 1 minute.
  windowMs: 60 * 1000,

  // Maximum number of requests allowed
  // during that minute.
  max: 180,

  // Response sent if the device sends
  // too many requests.
  message: {
    message:
      "Too many sensor readings. Please wait before trying again.",
  },

  // Use modern rate-limit headers.
  standardHeaders: true,

  // Disable old legacy headers.
  legacyHeaders: false,
});


// ---------------------------------------------------------
// DEVICE REQUEST TRACE MIDDLEWARE
// ---------------------------------------------------------

/**
 * Logs every incoming ESP32 telemetry request.
 *
 * Useful for debugging problems such as:
 * - 401 unauthorized
 * - 400 invalid telemetry
 * - 429 too many requests
 *
 * It does NOT log the actual secret device key.
 */
function traceDeviceRequest(req, res, next) {

  // Save the request start time.
  const startedAt = Date.now();


  // "finish" runs after the response has been sent.
  res.on("finish", () => {

    console.log(

      // HTTP method and URL.
      `[Telemetry] ${req.method} ${req.originalUrl} ` +

      // IP address and device ID.
      `from=${req.ip} ` +
      `device=${req.body?.deviceId ?? "unknown"} ` +

      // Only logs whether the device key exists.
      // It does NOT print the key itself.
      `key=${
        req.get("x-device-key")
          ? "present"
          : "missing"
      } ` +

      // HTTP response code and processing time.
      `-> ${res.statusCode} ` +
      `(${Date.now() - startedAt} ms)`
    );
  });


  // Continue to the next middleware.
  next();
}


// ---------------------------------------------------------
// POST TELEMETRY ROUTE
// ---------------------------------------------------------

// app.js mounts this router at:
//
// /api/sensors
//
// So this route:
//
// /ultrasonic
//
// becomes:
//
// POST /api/sensors/ultrasonic
//
// This endpoint is mainly called by the ESP32.
router.post(

  "/ultrasonic",

  // 1. Log the request.
  traceDeviceRequest,

  // 2. Prevent excessive telemetry requests.
  deviceReadingLimiter,

  // 3. Authenticate the physical ESP32 device.
  authenticateDevice,

  // 4. Validate the telemetry JSON body.
  validateRequest(
    ultrasonicReadingSchema
  ),

  // 5. If everything above succeeds,
  // pass the request to the controller.
  receiveUltrasonicReading
);


// ---------------------------------------------------------
// GET LATEST TELEMETRY ROUTE
// ---------------------------------------------------------

// This becomes:
//
// GET /api/sensors/ultrasonic/latest
//
// This route is for authenticated users,
// not directly for the ESP32.
router.get(

  "/ultrasonic/latest",

  // Verify that the user is logged in.
  authenticate,

  // Return the latest telemetry reading.
  getLatestUltrasonicReading
);


// ---------------------------------------------------------
// EXPORT ROUTER
// ---------------------------------------------------------

// Export the router so app.js can mount it:
//
// app.use("/api/sensors", sensorRoutes);
export default router;