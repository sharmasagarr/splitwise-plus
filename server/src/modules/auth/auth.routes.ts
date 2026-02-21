import { Router } from "express";
import passport from "passport";
import { createJwt } from "./passport.js";

const router = Router();

/* ================= GOOGLE ================= */

// Step 1: Redirect to Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Step 2: Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/failure",
  }),
  (req, res) => {
    // ✅ USER IS NOW AUTHENTICATED
    const user = req.user as { id: string };

    const token = createJwt(user);

    // ✅ REDIRECT BACK TO MOBILE APP
    res.redirect(`splitwiseplus://auth?token=${token}`);
  }
);

/* ================= GITHUB ================= */

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/auth/failure",
  }),
  (req, res) => {
    const user = req.user as { id: string };

    const token = createJwt(user);

    res.redirect(`splitwiseplus://auth?token=${token}`);
  }
);

/* ================= FAILURE ================= */

router.get("/failure", (_req, res) => {
  res.status(401).json({ message: "OAuth authentication failed" });
});

export default router;