export const userResolvers = {
  Query: {
    me: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) return null;
      return prisma.user.findUnique({ where: { id: user.id } });
    },
  },
  Mutation: {
    updateProfile: async (
      _: any,
      { name, imageUrl, phone }: any,
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

      if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;
      if (phone !== undefined) dataToUpdate.phone = phone;

      return prisma.user.update({
        where: { id: user.id },
        data: dataToUpdate,
      });
    },
  },
};
