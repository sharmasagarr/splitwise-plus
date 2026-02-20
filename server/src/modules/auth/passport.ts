import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import { findOrCreateOAuthUser } from "./oauth.service";

/* ================= JWT ================= */

export const createJwt = (user: { id: string }) => {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/* ================= GOOGLE ================= */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider: "google",
          providerUserId: profile.id, 
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          imageUrl: profile.photos?.[0]?.value,
        });

        done(null, user);
      } catch (error) {
        done(error, undefined);
      }
    }
  )
);

/* ================= GITHUB ================= */

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider: "github",
          providerUserId: profile.id,
          email: profile.emails?.[0]?.value ?? null,
          name: profile.username ?? "GitHub User",
          imageUrl: profile.photos?.[0]?.value,
        });

        done(null, user);
      } catch (error) {
        done(error, undefined);
      }
    }
  )
);
