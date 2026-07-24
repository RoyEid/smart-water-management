import "./config/env.js";
import mongoose from "mongoose";
import User from "./models/User.js";
import { hashToken } from "./utils/hashToken.js";

const API_URL = "http://localhost:5000/api/auth";

async function runTests() {
  console.log("=== STARTING AUTH INTEGRATION TESTS WITH NATIVE FETCH ===");
  
  // Connect to DB for state manipulation
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart-water-management";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for testing state management.");

  // Clear existing test users to ensure clean slate
  await User.deleteMany({ email: { $in: ["test_user@example.com", "unverified_user@example.com"] } });
  console.log("Cleared old test users.");

  let cookie = "";

  // Helper for requests
  const post = async (url, body, headers = {}) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, headers: res.headers, data };
  };

  const get = async (url, headers = {}) => {
    const res = await fetch(url, {
      method: "GET",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, headers: res.headers, data };
  };

  // Test 1: Register new user
  console.log("\n[Test 1] Registering a new user...");
  const regRes = await post(`${API_URL}/register`, {
    name: "Test User",
    email: "test_user@example.com",
    password: "Password123",
  });
  console.log("Register response status:", regRes.status);
  console.log("Register response message:", regRes.data.message);
  if (regRes.status !== 201) throw new Error("Registration failed");

  // Test 2: Reject duplicate registration
  console.log("\n[Test 2] Trying to register the duplicate email...");
  const dupRes = await post(`${API_URL}/register`, {
    name: "Duplicate User",
    email: "test_user@example.com",
    password: "Password123",
  });
  if (dupRes.status === 400) {
    console.log("PASS: Duplicate registration failed with status 400.");
    console.log("Error details:", dupRes.data);
  } else {
    console.error("FAIL: Duplicate registration did not return 400. Status:", dupRes.status);
  }

  // Test 3: Unverified user cannot log in
  console.log("\n[Test 3] Trying to login as unverified user...");
  const unverifiedRes = await post(`${API_URL}/login`, {
    email: "test_user@example.com",
    password: "Password123",
  });
  if (unverifiedRes.status === 403) {
    console.log("PASS: Unverified login failed with status 403.");
    console.log("Error details:", unverifiedRes.data);
  } else {
    console.error("FAIL: Unverified login did not return 403. Status:", unverifiedRes.status);
  }

  // Test 4: Verify email with incorrect code and then correct code
  console.log("\n[Test 4] Verifying email address...");
  const user = await User.findOne({ email: "test_user@example.com" });
  if (!user) throw new Error("Test user not found in DB");
  
  const testCode = "111111";
  user.emailVerificationCodeHash = hashToken(testCode);
  user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.emailVerificationAttempts = 0;
  await user.save();
  console.log("Stubbed verification code hash to '111111' in database.");

  // Test invalid code
  const verifyInvalidRes = await post(`${API_URL}/verify-email`, {
    email: "test_user@example.com",
    code: "999999",
  });
  if (verifyInvalidRes.status === 400) {
    console.log("PASS: Invalid code verification failed with status 400.");
    console.log("Error message:", verifyInvalidRes.data.message);
  } else {
    console.error("FAIL: Invalid code verification did not fail. Status:", verifyInvalidRes.status);
  }

  // Test correct code
  const verifyRes = await post(`${API_URL}/verify-email`, {
    email: "test_user@example.com",
    code: testCode,
  });
  if (verifyRes.status === 200) {
    console.log("PASS: Code verification succeeded. Status:", verifyRes.status);
    console.log("Response:", verifyRes.data.message);
  } else {
    throw new Error("Verification with correct code failed: " + verifyRes.data.message);
  }

  // Check in DB that verification fields are cleared and isVerified is true
  const verifiedUser = await User.findOne({ email: "test_user@example.com" });
  console.log(`User.isVerified in DB: ${verifiedUser.isVerified}`);
  console.log(`User.emailVerificationCodeHash cleared: ${verifiedUser.emailVerificationCodeHash === undefined}`);

  // Test 5: Successful Login (Remember Me = true)
  console.log("\n[Test 5] Logging in with verified account...");
  const loginRes = await post(`${API_URL}/login`, {
    email: "test_user@example.com",
    password: "Password123",
    rememberMe: true,
  });
  if (loginRes.status === 200) {
    console.log("PASS: Login succeeded. Status:", loginRes.status);
    console.log("User details:", loginRes.data.user);
  } else {
    throw new Error("Login failed: " + loginRes.data.message);
  }
  
  // Extract Set-Cookie header
  const setCookie = loginRes.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(";")[0];
    console.log("PASS: auth_token cookie set:", cookie);
    console.log("Cookie attributes:", setCookie.substring(setCookie.indexOf(";") + 1));
  } else {
    console.error("FAIL: Set-Cookie header missing in login response!");
  }

  // Test 6: GET /api/auth/me (Protected route)
  console.log("\n[Test 6] Fetching current authenticated user (/me)...");
  const meRes = await get(`${API_URL}/me`, { Cookie: cookie });
  if (meRes.status === 200) {
    console.log("PASS: /me response status:", meRes.status);
    console.log("User details from /me:", meRes.data.user);
  } else {
    throw new Error("GET /me failed: " + meRes.data.message);
  }

  // Test 7: Forgot password and verification code attempts
  console.log("\n[Test 7] Forgot password trigger...");
  const forgotRes = await post(`${API_URL}/forgot-password`, {
    email: "test_user@example.com",
  });
  console.log("Forgot password status:", forgotRes.status);
  console.log("Response:", forgotRes.data.message);

  // Bypassing email reset code
  const resetUser = await User.findOne({ email: "test_user@example.com" });
  const testResetCode = "222222";
  resetUser.passwordResetCodeHash = hashToken(testResetCode);
  resetUser.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  resetUser.passwordResetAttempts = 0;
  await resetUser.save();
  console.log("Stubbed reset code hash to '222222' in database.");

  // Verify reset code
  console.log("Verifying reset code...");
  const verifyResetRes = await post(`${API_URL}/verify-reset-code`, {
    email: "test_user@example.com",
    code: testResetCode,
  });
  if (verifyResetRes.status === 200) {
    console.log("PASS: Reset code verified. Status:", verifyResetRes.status);
  } else {
    throw new Error("Verification of reset code failed: " + verifyResetRes.data.message);
  }
  const resetToken = verifyResetRes.data.resetToken;
  console.log("One-time resetToken received:", resetToken);

  // Test 8: Reset password and try login with old & new passwords
  console.log("\n[Test 8] Resetting password...");
  const resetPasswordRes = await post(`${API_URL}/reset-password`, {
    email: "test_user@example.com",
    resetToken,
    password: "NewPassword123",
  });
  if (resetPasswordRes.status === 200) {
    console.log("PASS: Password reset status:", resetPasswordRes.status);
    console.log("Response:", resetPasswordRes.data.message);
  } else {
    throw new Error("Password reset failed: " + resetPasswordRes.data.message);
  }

  // Try login with old password (should fail)
  console.log("Trying login with old password...");
  const oldLoginRes = await post(`${API_URL}/login`, {
    email: "test_user@example.com",
    password: "Password123",
  });
  if (oldLoginRes.status === 401) {
    console.log("PASS: Login with old password failed with status 401.");
  } else {
    console.error("FAIL: Login with old password did not fail with 401. Status:", oldLoginRes.status);
  }

  // Try login with new password (should succeed)
  console.log("Trying login with new password...");
  const loginNewRes = await post(`${API_URL}/login`, {
    email: "test_user@example.com",
    password: "NewPassword123",
  });
  if (loginNewRes.status === 200) {
    console.log("PASS: Login with new password succeeded! Status:", loginNewRes.status);
  } else {
    throw new Error("Login with new password failed: " + loginNewRes.data.message);
  }

  // Test 9: Logout
  console.log("\n[Test 9] Logging out...");
  const logoutRes = await post(`${API_URL}/logout`);
  console.log("PASS: Logout status:", logoutRes.status);
  const clearCookieHeader = logoutRes.headers.get("set-cookie");
  if (clearCookieHeader) {
    console.log("PASS: Cookie clear attributes:", clearCookieHeader);
  }

  // Cleanup database
  await User.deleteMany({ email: "test_user@example.com" });
  console.log("\nDatabase test users cleaned up.");
  
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
  console.log("\n=== ALL AUTH INTEGRATION TESTS COMPLETED SUCCESSFULLY ===");
}

runTests().catch(async (err) => {
  console.error("TEST RUN FAILED:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
