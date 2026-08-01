import "../config/env.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import connectDB from "../config/database.js";

/**
 * One-time bootstrap for the first administrator.
 *
 * Registration always creates a plain user (deliberately — the public endpoint
 * must never mint an admin), so the very first admin has to be created out of
 * band. Run once per installation:
 *
 *   npm run create-admin -- admin@example.com "Ada Lovelace" "StrongPass1"
 *
 * If the account already exists it is promoted rather than recreated, so this
 * is safe to re-run and never overwrites an existing password.
 */
async function main() {
  const [email, name, password] = process.argv.slice(2);

  if (!email) {
    console.error(
      'Usage: npm run create-admin -- <email> ["Full Name"] [password]\n' +
      "  - existing account: promoted to admin (name/password ignored)\n" +
      "  - new account: name and password are required"
    );
    process.exit(1);
  }

  await connectDB();

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    if (existing.role === "admin") {
      console.log(`${normalizedEmail} is already an administrator. Nothing to do.`);
    } else {
      existing.role = "admin";
      existing.isVerified = true;
      existing.isActive = true;
      await existing.save();
      console.log(`Promoted ${normalizedEmail} to administrator.`);
    }
    await mongoose.disconnect();
    return;
  }

  if (!name || !password) {
    console.error(
      `No account exists for ${normalizedEmail}. Provide a name and password to create one:\n` +
      '  npm run create-admin -- <email> "Full Name" <password>'
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    await mongoose.disconnect();
    process.exit(1);
  }

  await User.create({
    name: name.trim(),
    email: normalizedEmail,
    // Same cost factor the registration path uses, so a bootstrapped admin is
    // not weaker than a normally registered account.
    password: await bcrypt.hash(password, 12),
    role: "admin",
    // Pre-verified: there is no inbox to check during a first-run bootstrap.
    isVerified: true,
    isActive: true,
    authProvider: "local",
  });

  console.log(`Created administrator ${normalizedEmail}.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to create administrator:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
