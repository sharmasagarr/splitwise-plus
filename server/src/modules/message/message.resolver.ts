const serializeReplyMessage = (message: any) => {
  if (!message) return null;

  return {
    id: message.id,
    seq: Number(message.seq),
    senderId: message.senderId,
    sender: message.sender,
    type: message.type,
    body: message.body,
  };
};

const serializeChatMessage = (message: any, replyMessage?: any) => ({
  ...message,
  seq: Number(message.seq),
  metadata: message.metadata ? JSON.stringify(message.metadata) : null,
  replyToSeq: message.replyToSeq ? Number(message.replyToSeq) : null,
  replyToMessage: serializeReplyMessage(replyMessage),
});

export const messageResolvers = {
  Query: {
    getConversations: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");

      const conversations = await prisma.conversation.findMany({
        where: {
          participants: { some: { userId: user.id, leftAt: null } },
        },
        include: {
          group: {
            select: {
              imageUrl: true,
            },
          },
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
        imageUrl: c.group?.imageUrl ?? null,
        lastMessage: c.messages[0] ? serializeChatMessage(c.messages[0]) : null,
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

      const replySeqs = Array.from(
        new Set(
          messages
            .map((message: any) => message.replyToSeq)
            .filter((seq: bigint | null): seq is bigint => Boolean(seq)),
        ),
      );

      const replyMessages = replySeqs.length
        ? await prisma.message.findMany({
            where: {
              conversationId,
              seq: { in: replySeqs },
            },
            include: {
              sender: true,
            },
          })
        : [];

      const replyMessageMap = new Map(
        replyMessages.map((message: any) => [String(message.seq), message]),
      );

      return messages.reverse().map((message: any) =>
        serializeChatMessage(
          message,
          message.replyToSeq
            ? replyMessageMap.get(String(message.replyToSeq))
            : null,
        ),
      );
    },
  },

  Mutation: {
    sendMessage: async (
      _: any,
      { conversationId, body, type = "text", metadata, replyToSeq }: any,
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

      let replyMessage = null;
      if (typeof replyToSeq === "number") {
        replyMessage = await prisma.message.findFirst({
          where: {
            conversationId,
            seq: BigInt(replyToSeq),
          },
          include: {
            sender: true,
          },
        });

        if (!replyMessage) {
          throw new Error("Reply target not found");
        }
      }

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
          replyToSeq:
            typeof replyToSeq === "number" ? BigInt(replyToSeq) : undefined,
        },
        include: {
          sender: true,
          reactions: { include: { user: true } },
        },
      });

      return serializeChatMessage(message, replyMessage);
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
          lastMessage: c.messages[0] ? serializeChatMessage(c.messages[0]) : null,
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
