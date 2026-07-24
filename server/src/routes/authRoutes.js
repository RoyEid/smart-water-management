import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import passport from "../config/passport.js";
import validateRequest from "../middleware/validateRequest.js";
import authenticate from "../middleware/authenticate.js";
import { setAuthCookie } from "../utils/cookies.js";
import {
  register,
  resendVerification,
  verifyEmail,
  login,
  logout,
  me,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  updateProfile,
  changePassword,
  deleteAccount,
  signJWT,
} from "../controllers/authController.js";

const router = Router();

const createLimiter = (minutes, max, message) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    max,
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const registerLimiter = createLimiter(
  15,
  10,
  "Too many registration attempts. Please try again in 15 minutes."
);

const loginLimiter = createLimiter(
  15,
  10,
  "Too many login attempts. Please try again in 15 minutes."
);

const verificationLimiter = createLimiter(
  15,
  10,
  "Too many verification requests. Please try again in 15 minutes."
);

const forgotPasswordLimiter = createLimiter(
  15,
  5,
  "Too many password recovery requests. Please try again in 15 minutes."
);

const oauthLimiter = createLimiter(
  15,
  20,
  "Too many OAuth login attempts. Please try again later."
);

const profileLimiter = createLimiter(
  15,
  15,
  "Too many profile update requests. Please try again later."
);

const changePasswordLimiter = createLimiter(
  15,
  5,
  "Too many password change attempts. Please try again later."
);

const deleteAccountLimiter = createLimiter(
  60,
  3,
  "Too many account deletion attempts. Please try again later."
);

const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your full name."),
    email: z.string().trim().email("Please enter a valid email address."),
    password: passwordValidation,
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
    password: z.string().min(1, "Password is required."),
    rememberMe: z.boolean().optional().default(false),
  })
  .strict();

const verifyEmailSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
    code: z
      .string()
      .length(6, "Verification code must be 6 digits.")
      .regex(/^\d+$/, "Verification code must contain only digits."),
  })
  .strict();

const resendVerificationSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
  })
  .strict();

const verifyResetCodeSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
    code: z
      .string()
      .length(6, "Verification code must be 6 digits.")
      .regex(/^\d+$/, "Verification code must contain only digits."),
  })
  .strict();

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name must not exceed 80 characters."),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordValidation,
  })
  .strict();

const deleteAccountSchema = z
  .object({
    password: z.string().optional(),
    confirmText: z.string().optional(),
  })
  .strict();

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address."),
    resetToken: z.string().min(1, "Reset token is required."),
    password: passwordValidation,
  })
  .strict();

/* Google OAuth */

router.get(
  "/google",
  oauthLimiter,
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    if (err || !user) {
      const errorType = info?.message || "google";
      return res.redirect(`${frontendUrl}/login?oauthError=${errorType}`);
    }

    const token = signJWT(user._id, user.role);
    setAuthCookie(res, token, true);

    return res.redirect(`${frontendUrl}/dashboard`);
  })(req, res, next);
});

/* GitHub OAuth */

router.get(
  "/github",
  oauthLimiter,
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

router.get("/github/callback", (req, res, next) => {
  passport.authenticate("github", { session: false }, (err, user, info) => {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    if (err || !user) {
      const errorType = info?.message || "github";
      return res.redirect(`${frontendUrl}/login?oauthError=${errorType}`);
    }

    const token = signJWT(user._id, user.role);
    setAuthCookie(res, token, true);

    return res.redirect(`${frontendUrl}/dashboard`);
  })(req, res, next);
});

/* Local authentication */

router.post(
  "/register",
  registerLimiter,
  validateRequest(registerSchema),
  register
);

router.post(
  "/resend-verification",
  verificationLimiter,
  validateRequest(resendVerificationSchema),
  resendVerification
);

router.post(
  "/verify-email",
  verificationLimiter,
  validateRequest(verifyEmailSchema),
  verifyEmail
);

router.post(
  "/login",
  loginLimiter,
  validateRequest(loginSchema),
  login
);

router.post("/logout", logout);

router.get("/me", authenticate, me);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateRequest(forgotPasswordSchema),
  forgotPassword
);

router.post(
  "/verify-reset-code",
  verificationLimiter,
  validateRequest(verifyResetCodeSchema),
  verifyResetCode
);

router.post(
  "/reset-password",
  forgotPasswordLimiter,
  validateRequest(resetPasswordSchema),
  resetPassword
);

/* Profile & Settings */

router.patch(
  "/profile",
  authenticate,
  profileLimiter,
  validateRequest(updateProfileSchema),
  updateProfile
);

router.patch(
  "/change-password",
  authenticate,
  changePasswordLimiter,
  validateRequest(changePasswordSchema),
  changePassword
);

router.delete(
  "/account",
  authenticate,
  deleteAccountLimiter,
  validateRequest(deleteAccountSchema),
  deleteAccount
);

export default router;