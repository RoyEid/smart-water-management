// ---------------------------------------------------------
// DEVICE AUTHENTICATION MIDDLEWARE
// ---------------------------------------------------------

// Import Node.js built-in crypto module.
//
// We use it here to:
// 1. create SHA-256 hashes
// 2. safely compare the device API keys
import crypto from "crypto";


// ---------------------------------------------------------
// HELPER FUNCTION: HASH THE API KEY
// ---------------------------------------------------------

// Takes a string and converts it into a SHA-256 hash.
//
// Example:
//
// "my-secret-key"
//       ↓
// SHA-256
//       ↓
// fixed-size binary hash
//
// We compare hashes instead of directly comparing
// the original strings.
function hashKey(value) {
  return crypto
    .createHash("sha256") // Create SHA-256 hash generator
    .update(value)        // Put the API key into the hash
    .digest();            // Return the result as a Buffer
}


// ---------------------------------------------------------
// AUTHENTICATE ESP32 DEVICE
// ---------------------------------------------------------

// This middleware runs BEFORE the sensor controller.
//
// It receives:
//
// req  = incoming HTTP request
// res  = HTTP response
// next = function used to continue to the next middleware/controller
export default function authenticateDevice(req, res, next) {

  // -------------------------------------------------------
  // 1. GET THE CORRECT DEVICE KEY FROM .env
  // -------------------------------------------------------

  // The backend stores the expected secret device key in:
  //
  // server/.env
  //
  // Example:
  //
  // DEVICE_API_KEY=mySecretDeviceKey
  const configuredKey = process.env.DEVICE_API_KEY;


  // -------------------------------------------------------
  // 2. CHECK THAT SERVER CONFIGURATION EXISTS
  // -------------------------------------------------------

  // If DEVICE_API_KEY is missing from .env,
  // the backend cannot authenticate any ESP32.
  if (!configuredKey) {

    console.error(
      "[Device Auth] DEVICE_API_KEY is not set in server/.env. " +
      "Every device request will be rejected until it is configured."
    );


    // Create an error object.
    const error = new Error(
      "Device API authentication is not configured."
    );


    // HTTP 500 = Internal Server Error.
    //
    // This is a SERVER configuration problem,
    // not a problem caused by the ESP32.
    error.statusCode = 500;


    // Send the error to the centralized error handler.
    //
    // Because we use:
    //
    // return next(error)
    //
    // execution stops here.
    return next(error);
  }


  // -------------------------------------------------------
  // 3. READ THE KEY SENT BY THE ESP32
  // -------------------------------------------------------

  // ESP32 sends its key inside an HTTP header:
  //
  // x-device-key
  //
  // Example:
  //
  // x-device-key: mySecretDeviceKey
  const providedKey = req.get("x-device-key");


  // -------------------------------------------------------
  // 4. CHECK IF THE HEADER EXISTS
  // -------------------------------------------------------

  // If x-device-key doesn't exist,
  // providedKey will not be a string.
  if (typeof providedKey !== "string") {

    console.warn(
      `[Device Auth] REJECTED ${req.method} ${req.originalUrl} from ${req.ip}: ` +
      "the x-device-key header is missing."
    );


    const error = new Error(
      "Missing device API key header 'x-device-key'."
    );


    // HTTP 401 = Unauthorized.
    //
    // The requester has not provided valid authentication.
    error.statusCode = 401;


    return next(error);
  }


  // -------------------------------------------------------
  // 5. COMPARE ESP32 KEY WITH SERVER KEY
  // -------------------------------------------------------

  // trim() removes invisible spaces/new lines
  // from the beginning/end of both keys.
  //
  // Example:
  //
  // "secret123 "
  //
  // becomes:
  //
  // "secret123"
  //
  // This prevents accidental spaces in .env or firmware
  // from causing authentication failure.

  const isValid = crypto.timingSafeEqual(

    // Hash the key sent by ESP32.
    hashKey(providedKey.trim()),

    // Hash the correct key stored in server/.env.
    hashKey(configuredKey.trim())
  );


  // -------------------------------------------------------
  // WHY timingSafeEqual()?
  // -------------------------------------------------------

  // A normal comparison such as:
  //
  // providedKey === configuredKey
  //
  // may theoretically take slightly different amounts
  // of time depending on where the strings differ.
  //
  // timingSafeEqual() is designed to reduce information
  // leakage from timing-based attacks.
  //
  // We hash both keys first because SHA-256 always creates
  // fixed-size values, which is convenient for
  // timingSafeEqual() comparison.


  // -------------------------------------------------------
  // 6. WRONG KEY
  // -------------------------------------------------------

  if (!isValid) {

    // IMPORTANT:
    //
    // Never print the actual secret key.
    //
    // We only print the lengths for debugging.
    console.warn(
      `[Device Auth] REJECTED ${req.method} ${req.originalUrl} from ${req.ip}: ` +
      `x-device-key did not match (received ${providedKey.trim().length} chars, ` +
      `expected ${configuredKey.trim().length}).`
    );


    const error = new Error(
      "Invalid device API key."
    );


    // HTTP 401 = Unauthorized.
    error.statusCode = 401;


    return next(error);
  }


  // -------------------------------------------------------
  // 7. AUTHENTICATION SUCCESSFUL
  // -------------------------------------------------------

  // If execution reaches this point:
  //
  // - server has DEVICE_API_KEY
  // - ESP32 sent x-device-key
  // - the keys match
  //
  // So continue to the next middleware/controller.
  next();
}