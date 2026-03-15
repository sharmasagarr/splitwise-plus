import { sendNotification } from "../notification/notification.service.js";

export const expenseResolvers = {
  Query: {
    getGroupExpenses: async (
      _: any,
      { groupId }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      return prisma.expense.findMany({
        where: { groupId },
        include: {
          shares: { include: { user: true } },
          createdBy: true,
          attachments: true,
          group: { include: { members: { include: { user: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    getRecentActivities: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");
      return prisma.expense.findMany({
        where: {
          OR: [
            { createdById: user.id },
            { shares: { some: { userId: user.id } } },
          ],
        },
        include: {
          shares: { include: { user: true } },
          createdBy: true,
          attachments: true,
          group: { include: { members: { include: { user: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    },

    getMyBalances: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");

      // 1. Find all expenses where I have an unsettled share (I owe someone)
      const sharesIOwe = await prisma.expenseShare.findMany({
        where: {
          userId: user.id,
          status: "owed",
        },
        include: {
          expense: { include: { createdBy: true } },
        },
      });

      // 2. Find all unsettled shares on expenses I created (others owe me)
      const sharesOwedToMe = await prisma.expenseShare.findMany({
        where: {
          status: "owed",
          expense: { createdById: user.id },
          NOT: { userId: user.id },
        },
        include: {
          user: true,
          expense: true,
        },
      });

      // Compute totals and per-user breakdown
      let totalOwe = 0;
      const oweMap: Record<
        string,
        { userId: string; userName: string; amount: number }
      > = {};

      for (const share of sharesIOwe) {
        const amt = Number(share.shareAmount) || 0;
        totalOwe += amt;
        const creatorId = share.expense.createdById;
        const creatorName = share.expense.createdBy?.name || "Unknown";
        if (!oweMap[creatorId]) {
          oweMap[creatorId] = {
            userId: creatorId,
            userName: creatorName,
            amount: 0,
          };
        }
        oweMap[creatorId].amount += amt;
      }

      let totalOwed = 0;
      const owedMap: Record<
        string,
        { userId: string; userName: string; amount: number }
      > = {};

      for (const share of sharesOwedToMe) {
        const amt = Number(share.shareAmount) || 0;
        totalOwed += amt;
        const debtor = share.user;
        if (!owedMap[debtor.id]) {
          owedMap[debtor.id] = {
            userId: debtor.id,
            userName: debtor.name,
            amount: 0,
          };
        }
        owedMap[debtor.id].amount += amt;
      }

      return {
        totalOwe: Math.round(totalOwe * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        oweList: Object.values(oweMap),
        owedList: Object.values(owedMap),
      };
    },

    getExpenseDetail: async (
      _: any,
      { expenseId }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
        include: {
          shares: { include: { user: true } },
          createdBy: true,
          attachments: true,
          group: { include: { members: { include: { user: true } } } },
        },
      });

      if (!expense) throw new Error("Expense not found");

      // Verify the user is a participant
      const isParticipant =
        expense.createdById === user.id ||
        expense.shares.some((s: any) => s.userId === user.id);
      if (!isParticipant)
        throw new Error("Not authorized to view this expense");

      return expense;
    },
  },
  Mutation: {
    createExpense: async (
      _: any,
      { groupId, description, amount, participants }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      if (!amount || amount <= 0)
        throw new Error("Amount must be greater than zero");
      if (!participants || participants.length === 0)
        throw new Error("Participants required");

      const perPerson = amount / participants.length;

      const expense = await prisma.expense.create({
        data: {
          groupId,
          createdById: user.id,
          totalAmount: amount,
          currency: "INR",
          note: description,
          shares: {
            create: participants.map((userId: string) => ({
              userId,
              shareAmount: perPerson,
              paidAmount: userId === user.id ? amount : 0,
              status: userId === user.id ? "settled" : "owed",
            })),
          },
        },
        include: {
          shares: { include: { user: true } },
          createdBy: true,
          attachments: true,
          group: { include: { members: { include: { user: true } } } },
        },
      });

      // Send notifications to all participants except the creator
      const creator = expense.createdBy;
      const perPersonAmount = (Math.round(perPerson * 100) / 100).toFixed(2);
      for (const participantId of participants) {
        if (participantId === user.id) continue;
        sendNotification({
          prisma,
          recipientId: participantId,
          type: "expense_added",
          title: "New Expense",
          body: `${creator.name} added '${description}' — you owe ₹${perPersonAmount}`,
          data: { groupId, expenseId: expense.id },
        }).catch((err: any) => console.error("Notification error:", err));
      }

      return expense;
    },

    settleExpense: async (
      _: any,
      { toUserId, amount, paymentMode, groupId }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      if (!amount || amount <= 0)
        throw new Error("Amount must be greater than zero");

      const validModes = ["cash", "upi", "bank", "card"];
      if (!validModes.includes(paymentMode.toLowerCase())) {
        throw new Error("Invalid payment mode");
      }

      // Find all unsettled shares where I owe `toUserId`
      const owedShares = await prisma.expenseShare.findMany({
        where: {
          userId: user.id,
          status: "owed",
          expense: { createdById: toUserId },
        },
        include: { expense: true },
        orderBy: { createdAt: "asc" },
      });

      // Mark shares as settled up to the settlement amount
      let remaining = amount;
      for (const share of owedShares) {
        if (remaining <= 0) break;
        const shareAmt = Number(share.shareAmount) || 0;
        const paidAlready = Number(share.paidAmount) || 0;
        const due = shareAmt - paidAlready;

        if (due <= 0) continue;

        if (remaining >= due) {
          // Fully settle this share
          await prisma.expenseShare.update({
            where: { id: share.id },
            data: { paidAmount: shareAmt, status: "settled" },
          });
          remaining -= due;
        } else {
          // Partially pay this share
          await prisma.expenseShare.update({
            where: { id: share.id },
            data: { paidAmount: paidAlready + remaining },
          });
          remaining = 0;
        }
      }

      // Create settlement record
      const settlement = await prisma.settlement.create({
        data: {
          fromUserId: user.id,
          toUserId: toUserId,
          amount,
          currency: "INR",
          status: "completed",
          paymentMethodId: paymentMode,
          ...(groupId ? { groupId } : {}),
        },
      });

      // Notify the payee
      const payer = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      });
      const formattedAmount = (Math.round(amount * 100) / 100).toFixed(2);
      sendNotification({
        prisma,
        recipientId: toUserId,
        type: "settlement_received",
        title: "Payment Received",
        body: `${payer?.name || "Someone"} paid you ₹${formattedAmount}`,
        data: { settlementId: settlement.id },
      }).catch((err: any) => console.error("Notification error:", err));

      return settlement;
    },
  },
};
