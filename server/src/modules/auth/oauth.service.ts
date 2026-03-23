import { prisma } from "../../db/index.js";
import {
  buildUsernameBaseFromName,
  generateUniqueUsername,
} from "../user/username.util.js";

/* ================= TYPES ================= */

type OAuthInput = {
  provider: "google" | "github";
  providerUserId: string; // Google/GitHub user id
  email?: string | null;
  name: string;
  imageUrl?: string | null;
};

/* ================= SERVICE ================= */

export const findOrCreateOAuthUser = async ({
  provider,
  providerUserId,
  email,
  name,
  imageUrl,
}: OAuthInput) => {
  // 1️⃣ Check if OAuth account already exists
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId,
      },
    },
    include: {
      user: true, // IMPORTANT
    },
  });

  if (existingAccount) {
    return existingAccount.user;
  }

  // 2️⃣ Try linking to existing user via email
  let user = email
    ? await prisma.user.findUnique({
        where: { email },
      })
    : null;

  if (user && !user.username) {
    const generatedUsername = await generateUniqueUsername(
      prisma,
      buildUsernameBaseFromName(user.name || name),
      user.id,
    );

    user = await prisma.user.update({
      where: { id: user.id },
      data: { username: generatedUsername },
    });
  }

  // 3️⃣ Create user if not found
  if (!user) {
    const generatedUsername = await generateUniqueUsername(
      prisma,
      buildUsernameBaseFromName(name),
    );

    user = await prisma.user.create({
      data: {
        name,
        username: generatedUsername,
        email,
        imageUrl,
        emailVerified: true, // OAuth emails are trusted
        bio: "Managing expenses smartly with friends and family.",
      },
    });
  }

  // 4️⃣ Create OAuth account linked to user
  await prisma.oAuthAccount.create({
    data: {
      provider,
      providerUserId,
      userId: user.id,
    },
  });

  return user;
};
