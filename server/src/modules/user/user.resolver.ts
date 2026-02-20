export const userResolvers = {
  Query: {
    me: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) return null;
      return prisma.user.findUnique({ where: { id: user.id } });
    },
  },
};