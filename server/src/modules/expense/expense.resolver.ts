import { sendNotification } from "../notification/notification.service.js";
import { splitAmount, getUserCurrency } from "../../utils/index.js";

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
        const shareAmt = Number(share.shareAmount) || 0;
        const paidAmt = Number(share.paidAmount) || 0;
        const amt = Math.max(shareAmt - paidAmt, 0);
        if (amt <= 0) continue;
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
        const shareAmt = Number(share.shareAmount) || 0;
        const paidAmt = Number(share.paidAmount) || 0;
        const amt = Math.max(shareAmt - paidAmt, 0);
        if (amt <= 0) continue;
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
    getUserUnsettledShares: async (
      _: any,
      { toUserId, groupId }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      return prisma.expenseShare.findMany({
        where: {
          userId: user.id,
          status: "owed",
          expense: {
            createdById: toUserId,
            ...(groupId ? { groupId } : {}),
          },
        },
        include: {
          user: true,
          expense: {
            include: {
              createdBy: true,
              group: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    },
    getMyTransactions: async (
      _: any,
      { relatedUserId, type, limit, offset }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      const whereClause: any = {
        userId: user.id,
        ...(relatedUserId ? { counterpartyUserId: relatedUserId } : {}),
        ...(type ? { type } : {}),
      };

      const clampLimit = (value: any) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) return 50;
        return Math.min(Math.floor(n), 200);
      };

      const toPositiveOffset = (value: any) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.floor(n);
      };

      const rows = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: clampLimit(limit),
        skip: toPositiveOffset(offset),
      });

      return rows.map((row: any) => ({
        ...row,
        amount: Number(row.amount) || 0,
        createdAt: row.createdAt?.toISOString?.() || row.createdAt,
      }));
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

      const actorCurrency = await getUserCurrency(prisma, user.id);

      const uniqueParticipants: string[] = Array.from(
        new Set((participants as string[]).filter(Boolean)),
      );
      if (!uniqueParticipants.includes(user.id)) {
        uniqueParticipants.push(user.id);
      }

      const splits = splitAmount(amount, uniqueParticipants.length);
      const settlerId = user.id;
      const settlerShare = splits[0];
      const otherShares = splits.slice(1);
      let otherIndex = 0;

      const shareInputs = uniqueParticipants.map((userId: string) => {
        const shareAmount =
          userId === settlerId ? settlerShare : (otherShares[otherIndex++] ?? settlerShare);

        return {
          userId,
          shareAmount,
          paidAmount: userId === settlerId ? shareAmount : 0,
          status: userId === settlerId ? "settled" : "owed",
        };
      });

      const expense = await prisma.expense.create({
        data: {
          groupId,
          createdById: user.id,
          paidById: user.id,
          totalAmount: amount,
          currency: actorCurrency,
          note: description,
          shares: {
            create: shareInputs,
          },
        },
        include: {
          shares: { include: { user: true } },
          createdBy: true,
          attachments: true,
          group: { include: { members: { include: { user: true } } } },
        },
      });

      const transactionRows: any[] = [
        {
          userId: user.id,
          expenseId: expense.id,
          groupId: groupId || null,
          type: "expense_created",
          direction: "debit",
          amount,
          currency: actorCurrency,
          note: description,
          metadata: {
            participantCount: uniqueParticipants.length,
          },
        },
      ];

      for (const share of expense.shares) {
        const shareAmount = Number(share.shareAmount) || 0;
        if (share.userId === user.id || shareAmount <= 0) continue;

        transactionRows.push(
          {
            userId: share.userId,
            counterpartyUserId: user.id,
            expenseId: expense.id,
            groupId: groupId || null,
            type: "expense_share_owed",
            direction: "debit",
            amount: shareAmount,
            currency: actorCurrency,
            note: description,
          },
          {
            userId: user.id,
            counterpartyUserId: share.userId,
            expenseId: expense.id,
            groupId: groupId || null,
            type: "expense_share_receivable",
            direction: "credit",
            amount: shareAmount,
            currency: actorCurrency,
            note: description,
          },
        );
      }

      if (transactionRows.length > 0) {
        await prisma.transaction.createMany({
          data: transactionRows,
        });
      }

      // Send notifications to all participants except the creator
      const creator = expense.createdBy;
      const shareByUserId: Record<string, number> = {};
      for (const share of expense.shares) {
        shareByUserId[share.userId] = Number(share.shareAmount) || 0;
      }

      for (const participantId of uniqueParticipants) {
        if (participantId === user.id) continue;
        const participantShare = shareByUserId[participantId] || 0;
        const formattedShare = (Math.round(participantShare * 100) / 100).toFixed(2);

        sendNotification({
          prisma,
          recipientId: participantId,
          type: "expense_added",
          title: "New Expense",
          body: `${creator.name} added '${description}' — you owe ₹${formattedShare}`,
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

      const actorCurrency = await getUserCurrency(prisma, user.id);

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
          currency: actorCurrency,
          status: "completed",
          paymentMethodId: paymentMode,
          ...(groupId ? { groupId } : {}),
        },
      });

      await prisma.transaction.createMany({
        data: [
          {
            userId: user.id,
            counterpartyUserId: toUserId,
            settlementId: settlement.id,
            groupId: groupId || null,
            type: "settlement_paid",
            direction: "debit",
            amount,
            currency: actorCurrency,
            paymentMethodId: paymentMode,
            note: "Settlement payment",
          },
          {
            userId: toUserId,
            counterpartyUserId: user.id,
            settlementId: settlement.id,
            groupId: groupId || null,
            type: "settlement_received",
            direction: "credit",
            amount,
            currency: actorCurrency,
            paymentMethodId: paymentMode,
            note: "Settlement received",
          },
        ],
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
    settleSpecificShares: async (
      _: any,
      { shareIds, amount, paymentMode, groupId }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      if (!Array.isArray(shareIds) || shareIds.length === 0) {
        throw new Error("Please select at least one share");
      }
      if (!amount || amount <= 0) {
        throw new Error("Amount must be greater than zero");
      }

      const actorCurrency = await getUserCurrency(prisma, user.id);

      const validModes = ["cash", "upi", "bank", "card"];
      if (!validModes.includes((paymentMode || "").toLowerCase())) {
        throw new Error("Invalid payment mode");
      }

      const shares = await prisma.expenseShare.findMany({
        where: {
          id: { in: shareIds },
          userId: user.id,
          status: "owed",
        },
        include: {
          expense: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (shares.length !== shareIds.length) {
        throw new Error("Some selected shares are invalid or already settled");
      }

      const payeeId = shares[0]?.expense?.createdById;
      if (!payeeId) {
        throw new Error("Could not identify payee for selected shares");
      }

      const mixedPayees = shares.some(s => s.expense.createdById !== payeeId);
      if (mixedPayees) {
        throw new Error("Please select shares for only one payee at a time");
      }

      const filteredByGroup = groupId
        ? shares.filter(s => s.expense.groupId === groupId)
        : shares;

      if (filteredByGroup.length === 0) {
        throw new Error("No selected shares matched the provided group");
      }

      const totalOutstanding = filteredByGroup.reduce((sum, share) => {
        const shareAmt = Number(share.shareAmount) || 0;
        const paidAmt = Number(share.paidAmount) || 0;
        return sum + Math.max(shareAmt - paidAmt, 0);
      }, 0);

      if (amount > totalOutstanding) {
        throw new Error("Amount exceeds outstanding selected shares");
      }

      let remaining = amount;
      for (const share of filteredByGroup) {
        if (remaining <= 0) break;
        const shareAmt = Number(share.shareAmount) || 0;
        const paidAlready = Number(share.paidAmount) || 0;
        const due = Math.max(shareAmt - paidAlready, 0);
        if (due <= 0) continue;

        if (remaining >= due) {
          await prisma.expenseShare.update({
            where: { id: share.id },
            data: { paidAmount: shareAmt, status: "settled" },
          });
          remaining -= due;
        } else {
          await prisma.expenseShare.update({
            where: { id: share.id },
            data: { paidAmount: paidAlready + remaining },
          });
          remaining = 0;
        }
      }

      const settlement = await prisma.settlement.create({
        data: {
          fromUserId: user.id,
          toUserId: payeeId,
          amount,
          currency: actorCurrency,
          status: "completed",
          paymentMethodId: paymentMode,
          ...(groupId ? { groupId } : {}),
        },
      });

      const relatedExpenseIds = Array.from(
        new Set(filteredByGroup.map(s => s.expenseId).filter(Boolean)),
      );

      await prisma.transaction.createMany({
        data: [
          {
            userId: user.id,
            counterpartyUserId: payeeId,
            settlementId: settlement.id,
            groupId: groupId || null,
            type: "settlement_paid",
            direction: "debit",
            amount,
            currency: actorCurrency,
            paymentMethodId: paymentMode,
            note: "Settlement payment",
            metadata: {
              shareIds,
              relatedExpenseIds,
            },
          },
          {
            userId: payeeId,
            counterpartyUserId: user.id,
            settlementId: settlement.id,
            groupId: groupId || null,
            type: "settlement_received",
            direction: "credit",
            amount,
            currency: actorCurrency,
            paymentMethodId: paymentMode,
            note: "Settlement received",
            metadata: {
              shareIds,
              relatedExpenseIds,
            },
          },
        ],
      });

      const payer = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      });
      const formattedAmount = (Math.round(amount * 100) / 100).toFixed(2);

      sendNotification({
        prisma,
        recipientId: payeeId,
        type: "settlement_received",
        title: "Payment Received",
        body: `${payer?.name || "Someone"} paid you ₹${formattedAmount}`,
        data: { settlementId: settlement.id },
      }).catch((err: any) => console.error("Notification error:", err));

      return settlement;
    },
  },
};
