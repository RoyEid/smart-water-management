import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import passport from "../config/passport.js";
import validateRequest from "../middleware/validateRequest.js";
import authenticate from "../middleware/authenticate.js";
import optionalAuth from "../middleware/optionalAuth.js";
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
  updateAvatar,
  updatePreferences,
  changePassword,
  deleteAccount,
  signJWT,
} from "../controllers/authController.js";
import { recordAudit } from "../services/auditService.js";
import { AUDIT_ACTIONS } from "../models/AuditLog.js";

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

// Roughly 700 kB of base64, which comfortably covers a resized profile photo
// while staying well inside a sane request size. The client downscales before
// upload; this is the backstop, not the primary limit.
const MAX_AVATAR_CHARS = 700_000;

const avatarSchema = z
  .object({
    avatar: z
      .string()
      .max(MAX_AVATAR_CHARS, "Image is too large. Please choose a smaller photo.")
      // Only inline raster data URLs. Rejecting arbitrary strings keeps a
      // remote URL — or an SVG, which can carry script — out of the <img src>.
      .regex(
        /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/,
        "Avatar must be a PNG, JPEG or WebP image."
      )
      .or(z.literal("")),
  })
  .strict();

const preferencesSchema = z
  .object({
    theme: z.enum(["system", "light", "dark"]).optional(),
    language: z.enum(["en", "ar", "fr", "zh"]).optional(),
    notificationPrefs: z
      .object({
        pumpAlerts: z.boolean().optional(),
        deviceOfflineAlerts: z.boolean().optional(),
        safetyAlerts: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
      })
      .strict()
      .optional(),
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

/**
 * Shared tail of both OAuth callbacks.
 *
 * A disabled account must be refused on every entry path, not just the local
 * password form — otherwise "disable this user" would be trivially bypassed by
 * signing in with Google.
 */
function completeOAuthLogin(provider) {
  return (req, res, next) => {
    passport.authenticate(provider, { session: false }, async (err, user, info) => {
      const frontendUrl =
        process.env.FRONTEND_URL ||
        process.env.CLIENT_URL ||
        "http://localhost:5173";

      if (err || !user) {
        const errorType = info?.message || provider;
        return res.redirect(`${frontendUrl}/login?oauthError=${errorType}`);
      }

      if (user.isActive === false) {
        return res.redirect(`${frontendUrl}/login?oauthError=account_disabled`);
      }

      const token = signJWT(user._id);
      setAuthCookie(res, token, true);

      try {
        user.lastLoginAt = new Date();
        await user.save();
        await recordAudit({
          req,
          actor: user,
          action: AUDIT_ACTIONS.LOGIN,
          targetType: "account",
          targetId: user._id,
          targetLabel: user.email,
          metadata: { provider },
        });
      } catch (auditError) {
        // The session is already valid; failing to record it must not send the
        // user back to the login page.
        console.error(`[Auth] ${provider} login bookkeeping failed:`, auditError.message);
      }

      return res.redirect(`${frontendUrl}/dashboard`);
    })(req, res, next);
  };
}

router.get("/google/callback", completeOAuthLogin("google"));

/* GitHub OAuth */

router.get(
  "/github",
  oauthLimiter,
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

router.get("/github/callback", completeOAuthLogin("github"));

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

router.post("/logout", optionalAuth, logout);

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

router.patch(
  "/avatar",
  authenticate,
  profileLimiter,
  validateRequest(avatarSchema),
  updateAvatar
);

router.patch(
  "/preferences",
  authenticate,
  profileLimiter,
  validateRequest(preferencesSchema),
  updatePreferences
);

router.delete(
  "/account",
  authenticate,
  deleteAccountLimiter,
  validateRequest(deleteAccountSchema),
  deleteAccount
);

export default router;