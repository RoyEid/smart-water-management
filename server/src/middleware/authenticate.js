import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function authenticate(req, res, next) {
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
    } catch (jwtErr) {
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

    // Attach user information to request object
    req.user = user;
    req.auth = decoded;
    next();
  } catch (error) {
    next(error);
  }
}
