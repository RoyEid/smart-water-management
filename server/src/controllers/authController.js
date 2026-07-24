import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { generateSixDigitCode } from "../utils/generateCode.js";
import { hashToken } from "../utils/hashToken.js";
import { setAuthCookie, clearAuthCookie } from "../utils/cookies.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";

// Helper to sign JWT
export function signJWT(userId, role) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign({ userId, role }, secret, { expiresIn });
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("An account with this email already exists.");
      error.statusCode = 400;
      error.errors = { email: "An account with this email already exists." };
      return next(error);
    }

    // Hash password with 12 rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user. Force role to "user"
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isVerified: false,
    });

    // Generate 6-digit code
    const rawCode = generateSixDigitCode();
    const codeHash = hashToken(rawCode);

    user.emailVerificationCodeHash = codeHash;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.emailVerificationAttempts = 0;

    await user.save();

    // Send email verification code
    await sendVerificationEmail(user.email, user.name, rawCode);

    res.status(201).json({
      message: "Registration successful! A six-digit verification code has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User account not found.");
      error.statusCode = 404;
      return next(error);
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "This account has already been verified. Please log in.",
      });
    }

    // Generate new code, invalidating the old code
    const rawCode = generateSixDigitCode();
    const codeHash = hashToken(rawCode);

    user.emailVerificationCodeHash = codeHash;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.emailVerificationAttempts = 0; // reset attempts

    await user.save();

    await sendVerificationEmail(user.email, user.name, rawCode);

    res.status(200).json({
      message: "A new verification code has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      const error = new Error("Account is already verified or does not exist.");
      error.statusCode = 400;
      return next(error);
    }

    // Check failed attempts
    if (user.emailVerificationAttempts >= 5) {
      const error = new Error("Too many failed verification attempts. Please request a new verification code.");
      error.statusCode = 400;
      return next(error);
    }

    // Check expiration
    if (new Date() > user.emailVerificationExpires) {
      const error = new Error("Verification code has expired. Please request a new code.");
      error.statusCode = 400;
      return next(error);
    }

    // Compare codes
    const codeHashInput = hashToken(code);
    if (user.emailVerificationCodeHash !== codeHashInput) {
      user.emailVerificationAttempts += 1;
      await user.save();

      const remaining = 5 - user.emailVerificationAttempts;
      const error = new Error(`Invalid verification code. You have ${remaining} attempts remaining.`);
      error.statusCode = 400;
      return next(error);
    }

    // Mark as verified and clear verification fields
    user.isVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationAttempts = 0;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully! You can now log in.",
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;

    // Retrieve user and explicitly select password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      return next(error);
    }

    if (!user.password) {
      const error = new Error(
        "This account uses Google or GitHub login. Please continue with your OAuth provider."
      );
      error.statusCode = 400;
      return next(error);
    }
    

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      return next(error);
    }

    // Check if account is verified
    if (!user.isVerified) {
      // Send a new verification code automatically for convenience
      const rawCode = generateSixDigitCode();
      const codeHash = hashToken(rawCode);

      user.emailVerificationCodeHash = codeHash;
      user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.emailVerificationAttempts = 0;
      await user.save();

      await sendVerificationEmail(user.email, user.name, rawCode);

      const error = new Error("Your account is not verified. A verification code has been sent to your email.");
      error.statusCode = 403;
      return next(error);
    }

    // Sign JWT
    const token = signJWT(user._id, user.role);

    // Set cookie
    setAuthCookie(res, token, rememberMe);

    res.status(200).json({
      message: "Logged in successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
        authProvider: user.authProvider || "local",
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    clearAuthCookie(res);
    res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    // Re-fetch with password field to determine hasPassword safely
    const userWithPw = await User.findById(req.user._id).select("+password");

    res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar || "",
        authProvider: req.user.authProvider || "local",
        isVerified: req.user.isVerified,
        hasPassword: Boolean(userWithPw?.password),
        connectedProviders: {
          google: Boolean(req.user.googleId),
          github: Boolean(req.user.githubId),
        },
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    // Always send generic success response to prevent email enumeration
    const genericResponse = {
      message: "If an account matches that email, a password reset code has been sent.",
    };

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate reset code
    const rawCode = generateSixDigitCode();
    const codeHash = hashToken(rawCode);

    user.passwordResetCodeHash = codeHash;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.passwordResetAttempts = 0;

    await user.save();

    await sendPasswordResetEmail(user.email, user.name, rawCode);

    return res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
}

export async function verifyResetCode(req, res, next) {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Invalid email or reset code.");
      error.statusCode = 400;
      return next(error);
    }

    // Check failed attempts
    if (user.passwordResetAttempts >= 5) {
      const error = new Error("Too many failed attempts. Please request a new password reset code.");
      error.statusCode = 400;
      return next(error);
    }

    // Check expiration
    if (new Date() > user.passwordResetExpires) {
      const error = new Error("Password reset code has expired. Please request a new one.");
      error.statusCode = 400;
      return next(error);
    }

    // Compare code
    const codeHashInput = hashToken(code);
    if (user.passwordResetCodeHash !== codeHashInput) {
      user.passwordResetAttempts += 1;
      await user.save();

      const remaining = 5 - user.passwordResetAttempts;
      const error = new Error(`Invalid reset code. You have ${remaining} attempts remaining.`);
      error.statusCode = 400;
      return next(error);
    }

    // Code is valid. Generate random reset token (single-use)
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashToken(rawResetToken);

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clear the code fields so they cannot be reused
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;

    await user.save();

    res.status(200).json({
      resetToken: rawResetToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, resetToken, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Invalid reset token or email.");
      error.statusCode = 400;
      return next(error);
    }

    // Check expiration
    if (!user.passwordResetTokenHash || new Date() > user.passwordResetTokenExpires) {
      const error = new Error("Reset token has expired. Please request a new reset code.");
      error.statusCode = 400;
      return next(error);
    }

    // Compare reset token
    const resetTokenHashInput = hashToken(resetToken);
    if (user.passwordResetTokenHash !== resetTokenHashInput) {
      const error = new Error("Invalid reset token.");
      error.statusCode = 400;
      return next(error);
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();

    // Clear reset token fields to prevent reuse
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      const error = new Error("Account not found.");
      error.statusCode = 404;
      return next(error);
    }

    user.name = name;
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
        authProvider: user.authProvider || "local",
        isVerified: user.isVerified,
        hasPassword: Boolean(user.password),
        connectedProviders: {
          google: Boolean(user.googleId),
          github: Boolean(user.githubId),
        },
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      const error = new Error("Account not found.");
      error.statusCode = 404;
      return next(error);
    }

    if (!user.password) {
      const error = new Error(
        "This account uses OAuth login and does not have a password set."
      );
      error.statusCode = 400;
      return next(error);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      const error = new Error("Current password is incorrect.");
      error.statusCode = 401;
      return next(error);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const { password, confirmText } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      const error = new Error("Account not found.");
      error.statusCode = 404;
      return next(error);
    }

    if (confirmText !== "DELETE") {
      const error = new Error("Please type DELETE to confirm account deletion.");
      error.statusCode = 400;
      return next(error);
    }

    // For users with a password, require password confirmation
    if (user.password) {
      if (!password) {
        const error = new Error("Password is required to delete your account.");
        error.statusCode = 400;
        return next(error);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const error = new Error("Incorrect password.");
        error.statusCode = 401;
        return next(error);
      }
    }

    await User.findByIdAndDelete(req.user._id);
    clearAuthCookie(res);

    res.status(200).json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
