import User from "../models/User.js";

/**
 * Finds an existing user by OAuth provider ID or verified email, or creates a new OAuth user.
 * 
 * @param {Object} params
 * @param {string} params.provider - "google" or "github"
 * @param {string} params.providerId - The ID returned by the provider
 * @param {string} params.email - The user's email address from the provider
 * @param {boolean} params.emailVerified - Whether the provider has verified the email
 * @param {string} [params.name] - The user's display name or username
 * @param {string} [params.avatar] - The user's avatar image URL
 * @returns {Promise<User>}
 */
export async function findOrCreateOAuthUser({
  provider,
  providerId,
  email,
  emailVerified,
  name,
  avatar,
}) {
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  const providerIdField = provider === "google" ? "googleId" : "githubId";

  // 1. Search by provider ID first
  let user = await User.findOne({ [providerIdField]: providerId });
  if (user) {
    // If user avatar is missing and a new one is provided, update it
    if (!user.avatar && avatar) {
      user.avatar = avatar;
      await user.save();
    }
    return user;
  }

  // Provider email MUST be present and verified for linking or creation
  if (!normalizedEmail || !emailVerified) {
    const error = new Error("no_email");
    error.code = "no_email";
    throw error;
  }

  // 2. Search by email
  user = await User.findOne({ email: normalizedEmail });

  if (user) {
    // Check if account is bound to a different provider ID for this provider
    if (user[providerIdField] && user[providerIdField] !== providerId) {
      const error = new Error("account_link_failed");
      error.code = "account_link_failed";
      throw error;
    }

    // Link provider ID
    user[providerIdField] = providerId;
    user.isVerified = true;

    if (!user.avatar && avatar) {
      user.avatar = avatar;
    }

    await user.save();
    return user;
  }

  // 3. Create a new OAuth user
  try {
    const fallbackName = provider === "google" ? "Google User" : "GitHub User";

    user = await User.create({
      name: name?.trim() || fallbackName,
      email: normalizedEmail,
      [providerIdField]: providerId,
      avatar: avatar || "",
      authProvider: provider,
      role: "user",
      isVerified: true,
    });

    return user;
  } catch (err) {
    // Handle MongoDB duplicate key error (11000)
    if (err.code === 11000) {
      // Retry finding user in case of race condition
      const existingUser = await User.findOne({
        $or: [{ [providerIdField]: providerId }, { email: normalizedEmail }],
      });
      if (existingUser) {
        return existingUser;
      }

      const error = new Error("account_link_failed");
      error.code = "account_link_failed";
      throw error;
    }
    throw err;
  }
}
