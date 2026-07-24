import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";

async function findOrCreateOAuthUser({
    provider,
    providerId,
    email,
    name,
    avatar,
}) {
    const normalizedEmail = email.toLowerCase();

    const providerField =
        provider === "google" ? "googleId" : "githubId";

    let user = await User.findOne({
        [providerField]: providerId,
    });

    if (user) {
        return user;
    }

    user = await User.findOne({
        email: normalizedEmail,
    });

    if (user) {
        user[providerField] = providerId;
        user.isVerified = true;

        if (!user.avatar && avatar) {
            user.avatar = avatar;
        }

        await user.save();
        return user;
    }

    return User.create({
        name,
        email: normalizedEmail,
        avatar: avatar || "",
        authProvider: provider,
        [providerField]: providerId,
        role: "user",
        isVerified: true,
    });
}

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;

                if (!email) {
                    return done(
                        new Error("Google did not provide an email address.")
                    );
                }

                const user = await findOrCreateOAuthUser({
                    provider: "google",
                    providerId: profile.id,
                    email,
                    name: profile.displayName || "Google User",
                    avatar: profile.photos?.[0]?.value || "",
                });

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
            scope: ["user:email"],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let email =
                    profile.emails?.find(
                        (item) => item.verified && item.primary
                    )?.value ||
                    profile.emails?.find(
                        (item) => item.verified
                    )?.value;

                if (!email) {
                    const response = await fetch(
                        "https://api.github.com/user/emails",
                        {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                Accept: "application/vnd.github+json",
                                "User-Agent": "Smart-Water-Management",
                            },
                        }
                    );

                    if (!response.ok) {
                        throw new Error(
                            `Unable to retrieve GitHub emails: ${response.status}`
                        );
                    }

                    const emails = await response.json();

                    email =
                        emails.find(
                            (item) => item.verified && item.primary
                        )?.email ||
                        emails.find(
                            (item) => item.verified
                        )?.email;
                }

                if (!email) {
                    return done(
                        new Error(
                            "No verified email address was provided by GitHub."
                        )
                    );
                }

                const user = await findOrCreateOAuthUser({
                    provider: "github",
                    providerId: profile.id,
                    email,
                    name:
                        profile.displayName ||
                        profile.username ||
                        "GitHub User",
                    avatar: profile.photos?.[0]?.value || "",
                });

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

export default passport;