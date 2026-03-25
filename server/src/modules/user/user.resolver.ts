import {
  USERNAME_REGEX,
  isValidUsername,
  normalizeUsernameInput,
  generateUniqueUsername,
} from "./username.util.js";

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) return null;
      return prisma.user.findUnique({ where: { id: user.id } });
    },
    checkUsernameAvailability: async (
      _: any,
      { username }: { username: string },
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      const normalized = normalizeUsernameInput(username);

      // Return invalid immediately — no DB hit needed
      if (!USERNAME_REGEX.test(normalized)) {
        return { available: false, suggestion: null };
      }

      const existing = await prisma.user.findUnique({
        where: { username: normalized },
        select: { id: true },
      });

      // Same user's current username — treat as available
      if (existing?.id === user.id) {
        return { available: true, suggestion: null };
      }

      if (!existing) {
        return { available: true, suggestion: null };
      }

      // Username taken — generate a suggestion
      const suggestion = await generateUniqueUsername(prisma, normalized, user.id);
      return { available: false, suggestion };
    },

  },
  Mutation: {
    updateProfile: async (
      _: any,
      { name, username, bio, imageUrl, phone, upiId }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      const dataToUpdate: any = {};

      if (name !== undefined) {
        const trimmedName = (name || "").trim();
        const isValidName =
          trimmedName.length >= 2 &&
          trimmedName.length <= 50 &&
          trimmedName
            .split("")
            .every(
              (ch: string) =>
                (ch >= "a" && ch <= "z") ||
                (ch >= "A" && ch <= "Z") ||
                ch === " ",
            );
        if (!isValidName) {
          throw new Error(
            "Invalid name. Only letters and spaces are allowed (2-50 characters).",
          );
        }
        dataToUpdate.name = trimmedName;
      }

      if (username !== undefined) {
        const normalizedUsername = normalizeUsernameInput(username);

        if (!isValidUsername(username)) {
          throw new Error(
            "Invalid username. Use 1-30 lowercase letters, numbers, periods, and underscores. Periods cannot be consecutive or at the end.",
          );
        }

        const existing = await prisma.user.findFirst({
          where: {
            username: normalizedUsername,
            id: { not: user.id },
          },
          select: { id: true },
        });

        if (existing) {
          throw new Error("Username is already taken");
        }

        if (!USERNAME_REGEX.test(normalizedUsername)) {
          throw new Error("Invalid username format");
        }

        dataToUpdate.username = normalizedUsername;
      }

      if (bio !== undefined) {
        const trimmedBio = (bio || "").trim();
        if (trimmedBio.length > 160) {
          throw new Error("Bio cannot exceed 160 characters");
        }
        dataToUpdate.bio = trimmedBio.length > 0 ? trimmedBio : null;
      }

      if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;
      if (phone !== undefined) dataToUpdate.phone = phone;
      if (upiId !== undefined) dataToUpdate.upiId = upiId;

      return prisma.user.update({
        where: { id: user.id },
        data: dataToUpdate,
      });
    },
  },
};
