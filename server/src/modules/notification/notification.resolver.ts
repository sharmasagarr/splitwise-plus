export const notificationResolvers = {
  Query: {
    getMyNotifications: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");
      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      // Serialize JSON payload to string for GraphQL
      return notifications.map((n: any) => ({
        ...n,
        payload: JSON.stringify(n.payload),
      }));
    },
  },
  Mutation: {
    registerFcmToken: async (
      _: any,
      { token }: { token: string },
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.user.update({
        where: { id: user.id },
        data: { fcmToken: token },
      });
      return true;
    },

    markNotificationRead: async (
      _: any,
      { id }: { id: string },
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      const notification = await prisma.notification.update({
        where: { id, userId: user.id },
        data: { read: true },
      });
      return {
        ...notification,
        payload: JSON.stringify(notification.payload),
      };
    },

    markAllNotificationsRead: async (
      _: any,
      __: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      return true;
    },
  },
};
