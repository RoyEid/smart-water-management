/**
 * Single place that decides which user fields may leave the server.
 *
 * Every route that returns a user goes through here, so a field added to the
 * schema later (a token hash, a secret, a new reset field) is excluded by
 * default instead of leaking because one controller forgot to omit it.
 */
export function serializeUser(user, { includePasswordFlag = false } = {}) {
  if (!user) return null;

  const serialized = {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || "",
    authProvider: user.authProvider || "local",
    isVerified: Boolean(user.isVerified),
    isActive: user.isActive !== false,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    connectedProviders: {
      google: Boolean(user.googleId),
      github: Boolean(user.githubId),
    },
    preferences: {
      theme: user.preferences?.theme || "light",
      language: user.preferences?.language || "en",
    },
    notificationPrefs: {
      pumpAlerts: user.notificationPrefs?.pumpAlerts !== false,
      deviceOfflineAlerts: user.notificationPrefs?.deviceOfflineAlerts !== false,
      safetyAlerts: user.notificationPrefs?.safetyAlerts !== false,
      emailNotifications: user.notificationPrefs?.emailNotifications === true,
    },
  };

  // Whether a password exists at all — never the hash itself. The settings UI
  // needs this to decide between "change password" and "OAuth only".
  if (includePasswordFlag) {
    serialized.hasPassword = Boolean(user.password);
  }

  return serialized;
}
