export const messageResolvers = {
  Query: {
    getConversations: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");

      const conversations = await prisma.conversation.findMany({
        where: {
          participants: { some: { userId: user.id, leftAt: null } },
        },
        include: {
          participants: { include: { user: true } },
          messages: {
            orderBy: { seq: "desc" },
            take: 1,
            include: { sender: true, reactions: { include: { user: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return conversations.map((c: any) => ({
        ...c,
        lastMessage: c.messages[0]
          ? {
              ...c.messages[0],
              seq: Number(c.messages[0].seq),
              metadata: c.messages[0].metadata
                ? JSON.stringify(c.messages[0].metadata)
                : null,
            }
          : null,
      }));
    },

    getMessages: async (
      _: any,
      { conversationId, limit = 50, before }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Verify user is participant
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: { conversationId, userId: user.id },
        },
      });
      if (!participant) throw new Error("Not a participant");

      const where: any = { conversationId };
      if (before) {
        where.seq = { lt: BigInt(before) };
      }

      const messages = await prisma.message.findMany({
        where,
        include: {
          sender: true,
          reactions: { include: { user: true } },
        },
        orderBy: { seq: "desc" },
        take: Math.min(limit, 100),
      });

      return messages.reverse().map((m: any) => ({
        ...m,
        seq: Number(m.seq),
        metadata: m.metadata ? JSON.stringify(m.metadata) : null,
      }));
    },
  },

  Mutation: {
    sendMessage: async (
      _: any,
      { conversationId, body, type = "text", metadata }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Verify participant
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: { conversationId, userId: user.id },
        },
      });
      if (!participant) throw new Error("Not a participant");

      // Increment seq atomically
      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastSeq: { increment: 1 }, updatedAt: new Date() },
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          seq: conversation.lastSeq,
          senderId: user.id,
          type,
          body,
          metadata: metadata ? JSON.parse(metadata) : undefined,
        },
        include: {
          sender: true,
          reactions: { include: { user: true } },
        },
      });

      return {
        ...message,
        seq: Number(message.seq),
        metadata: message.metadata ? JSON.stringify(message.metadata) : null,
      };
    },

    startDirectConversation: async (
      _: any,
      { userId: otherUserId }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      if (otherUserId === user.id)
        throw new Error("Cannot start conversation with yourself");

      // Deterministic ordering for unique lookup
      const [userA, userB] =
        user.id < otherUserId ? [user.id, otherUserId] : [otherUserId, user.id];

      // Check if DM already exists
      const existing = await prisma.directConversation.findUnique({
        where: { userA_userB: { userA, userB } },
        include: {
          conversation: {
            include: {
              participants: { include: { user: true } },
              messages: {
                orderBy: { seq: "desc" },
                take: 1,
                include: {
                  sender: true,
                  reactions: { include: { user: true } },
                },
              },
            },
          },
        },
      });

      if (existing) {
        const c = existing.conversation;
        return {
          ...c,
          lastMessage: c.messages[0]
            ? {
                ...c.messages[0],
                seq: Number(c.messages[0].seq),
                metadata: c.messages[0].metadata
                  ? JSON.stringify(c.messages[0].metadata)
                  : null,
              }
            : null,
        };
      }

      // Fetch other user for title
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
      });
      if (!otherUser) throw new Error("User not found");

      // Create conversation + directConversation + participants
      const conversation = await prisma.conversation.create({
        data: {
          type: "direct",
          title: null,
          createdById: user.id,
          participants: {
            create: [
              { userId: user.id, role: "member" },
              { userId: otherUserId, role: "member" },
            ],
          },
          directConversation: {
            create: { userA, userB },
          },
        },
        include: {
          participants: { include: { user: true } },
        },
      });

      return { ...conversation, lastMessage: null };
    },

    addReaction: async (
      _: any,
      { messageId, reaction }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Verify message exists and user is participant
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });
      if (!message) throw new Error("Message not found");

      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: message.conversationId,
            userId: user.id,
          },
        },
      });
      if (!participant) throw new Error("Not a participant");

      await prisma.messageReaction.upsert({
        where: {
          messageId_userId_reaction: { messageId, userId: user.id, reaction },
        },
        create: { messageId, userId: user.id, reaction },
        update: {},
      });

      return true;
    },

    removeReaction: async (
      _: any,
      { messageId, reaction }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      await prisma.messageReaction.deleteMany({
        where: { messageId, userId: user.id, reaction },
      });

      return true;
    },
  },
};
