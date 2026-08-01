import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verifies the httpOnly session cookie and loads the account.
 *
 * 401 means "we do not know who you are" (missing/invalid/expired token, or the
 * account no longer exists). 403 means "we know who you are and the answer is
 * still no" — used here for a disabled account, and by requireAdmin for role.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      const error = new Error("Authentication required. Please log in.");
      error.statusCode = 401;
      return next(error);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      console.error("JWT_SECRET is not configured properly. Must be at least 32 characters.");
      const error = new Error("Internal server configuration error.");
      error.statusCode = 500;
      return next(error);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      const error = new Error("Invalid or expired session token. Please log in again.");
      error.statusCode = 401;
      return next(error);
    }

    if (!decoded.userId) {
      const error = new Error("Invalid session token payload.");
      error.statusCode = 401;
      return next(error);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      const error = new Error("Account not found.");
      error.statusCode = 401;
      return next(error);
    }

    // A disabled account still holds a technically valid token, so the check
    // has to happen on every request rather than only at login.
    if (user.isActive === false) {
      const error = new Error(
        "This account has been disabled. Please contact an administrator."
      );
      error.statusCode = 403;
      return next(error);
    }

    // The role is read from the database, never from the token: an admin who is
    // demoted mid-session loses access immediately, and a token minted before
    // the change cannot keep elevated rights until it expires.
    req.user = user;
    req.auth = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Must run after requireAuth. Kept as a separate middleware so every admin
 * route reads `requireAuth, requireAdmin` and the authorization step is
 * impossible to overlook when a route is added.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    const error = new Error("Authentication required. Please log in.");
    error.statusCode = 401;
    return next(error);
  }

  if (req.user.role !== "admin") {
    const error = new Error("Administrator access is required for this action.");
    error.statusCode = 403;
    return next(error);
  }

  next();
}

// Existing routes import this module's default export; keeping it pointed at
// requireAuth avoids a rename sweep that could miss a route.
export default requireAuth;
