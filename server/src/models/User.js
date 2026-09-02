import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      select: false, // exclude password from query results by default
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },

    avatar: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    // A disabled account keeps its data but is refused at the authentication middleware.
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    // Server-side copy of the UI preferences so they follow the account across
    // browsers instead of living only in that browser's localStorage.
    preferences: {
      theme: {
        type: String,
        enum: ["system", "light", "dark"],
        default: "light",
      },
      language: {
        type: String,
        enum: ["en", "ar", "fr", "zh"],
        default: "en",
      },
    },
    notificationPrefs: {
      pumpAlerts: { type: Boolean, default: true },
      deviceOfflineAlerts: { type: Boolean, default: true },
      safetyAlerts: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: false },
    },
    // Email verification fields
    emailVerificationCodeHash: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
    },
    // Password reset fields
    passwordResetCodeHash: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    passwordResetAttempts: {
      type: Number,
      default: 0,
    },
    passwordResetTokenHash: {
      type: String,
    },
    passwordResetTokenExpires: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
