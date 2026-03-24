import { randomUUID } from "crypto";
import { sendNotification } from "../notification/notification.service.js";

export const groupResolvers = {
  Query: {
    getGroups: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");
      return prisma.group.findMany({
        where: { members: { some: { userId: user.id } } },
        include: { members: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      });
    },
    getGroupDetails: async (_: any, { id }: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.id } },
      });
      if (!member) throw new Error("Not a member of this group");

      return prisma.group.findUnique({
        where: { id },
        include: { members: { include: { user: true } } },
      });
    },
    searchUsers: async (_: any, { query }: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");
      if (!query || query.trim().length < 2) return [];

      return prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query.trim(), mode: "insensitive" } },
            { username: { contains: query.trim(), mode: "insensitive" } },
          ],
          id: { not: user.id },
        },
        take: 10,
      });
    },
    getMyInvites: async (_: any, __: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");

      // Context only has user.id, so fetch user email from DB
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new Error("User not found");

      const invites = await prisma.invite.findMany({
        where: {
          invitedEmail: dbUser.email,
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
      });

      // Manually attach the group to each invite
      const enriched = await Promise.all(
        invites.map(async (inv: any) => {
          const group = inv.groupId
            ? await prisma.group.findUnique({
                where: { id: inv.groupId },
                include: { members: { include: { user: true } } },
              })
            : null;
          return { ...inv, group };
        }),
      );

      return enriched;
    },
  },
  Mutation: {
    createGroup: async (
      _: any,
      { name, description, imageUrl, memberEmails }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");
      if (!name || name.trim().length === 0)
        throw new Error("Group name is required");

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

      const newGroup = await prisma.group.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          ownerId: user.id,
          imageUrl: imageUrl?.trim() || null,
          members: {
            create: { userId: user.id, role: "owner" },
          },
        },
      });

      // Auto-create a group conversation
      const conversation = await prisma.conversation.create({
        data: {
          type: "group",
          title: name.trim(),
          createdById: user.id,
          participants: {
            create: { userId: user.id, role: "owner" },
          },
        },
      });

      await prisma.group.update({
        where: { id: newGroup.id },
        data: { conversationId: conversation.id },
      });

      if (memberEmails && memberEmails.length > 0) {
        // For each email, create an invite (pending) instead of directly adding
        for (const email of memberEmails) {
          const trimmedEmail = email.trim();
          if (!trimmedEmail) continue;

          // Check if the user exists
          const targetUser = await prisma.user.findUnique({
            where: { email: trimmedEmail },
          });

          if (targetUser && targetUser.id !== user.id) {
            // Check not already a member
            const existingMember = await prisma.groupMember.findUnique({
              where: {
                groupId_userId: {
                  groupId: newGroup.id,
                  userId: targetUser.id,
                },
              },
            });

            if (!existingMember) {
              await prisma.invite.create({
                data: {
                  groupId: newGroup.id,
                  invitedEmail: trimmedEmail,
                  token: randomUUID(),
                  inviterId: user.id,
                  status: "pending",
                },
              });

              sendNotification({
                prisma,
                recipientId: targetUser.id,
                type: "group_invitation",
                title: "Group Invitation",
                body: `${dbUser?.name} invited you to join ${newGroup.name}`,
                data: { groupId: newGroup.id },
              }).catch((err: any) => console.error("Notification error:", err));
            }
          }
        }
      }

      return prisma.group.findUnique({
        where: { id: newGroup.id },
        include: { members: { include: { user: true } } },
      });
    },
    updateGroup: async (
      _: any,
      { id, name, description, imageUrl }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      const group = await prisma.group.findUnique({
        where: { id },
      });
      if (!group) throw new Error("Group not found");
      if (group.ownerId !== user.id)
        throw new Error("Only the group owner can edit this group");

      const trimmedName = typeof name === "string" ? name.trim() : undefined;
      if (trimmedName !== undefined && trimmedName.length === 0) {
        throw new Error("Group name is required");
      }

      const updatedGroup = await prisma.group.update({
        where: { id },
        data: {
          ...(trimmedName !== undefined ? { name: trimmedName } : {}),
          ...(description !== undefined
            ? { description: description?.trim() || null }
            : {}),
          ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() || null } : {}),
        },
        include: { members: { include: { user: true } } },
      });

      if (group.conversationId && trimmedName !== undefined) {
        await prisma.conversation.update({
          where: { id: group.conversationId },
          data: { title: trimmedName },
        });
      }

      return updatedGroup;
    },
    joinGroup: async (_: any, { token }: any, { prisma, user }: any) => {
      if (!user) throw new Error("Unauthorized");

      const invite = await prisma.invite.findUnique({ where: { token } });
      if (!invite || invite.status !== "pending" || !invite.groupId)
        throw new Error("Invalid or expired invite");

      // Check if already a member
      const existing = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: invite.groupId, userId: user.id },
        },
      });

      if (!existing) {
        await prisma.groupMember.create({
          data: { groupId: invite.groupId, userId: user.id, role: "member" },
        });

        // Also add to group conversation
        const group = await prisma.group.findUnique({
          where: { id: invite.groupId },
        });
        if (group?.conversationId) {
          const existingParticipant =
            await prisma.conversationParticipant.findUnique({
              where: {
                conversationId_userId: {
                  conversationId: group.conversationId,
                  userId: user.id,
                },
              },
            });
          if (!existingParticipant) {
            await prisma.conversationParticipant.create({
              data: {
                conversationId: group.conversationId,
                userId: user.id,
                role: "member",
              },
            });
          }
        }

        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (group && dbUser) {
          const groupWithMembers = await prisma.group.findUnique({
            where: { id: group.id },
            include: { members: true },
          });
          if (groupWithMembers) {
            for (const member of groupWithMembers.members) {
              if (member.userId !== user.id) {
                sendNotification({
                  prisma,
                  recipientId: member.userId,
                  type: "user_joined_group",
                  title: "New Member",
                  body: `${dbUser.name} joined ${group.name} by using invitation token`,
                  data: { groupId: group.id },
                }).catch((err: any) => console.error("Notification error:", err));
              }
            }
          }
        }
      }

      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      });

      return true;
    },
    inviteToGroup: async (
      _: any,
      { groupId, email }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

      // Verify caller is a member
      const callerMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
      });
      if (!callerMember) throw new Error("You are not a member of this group");

      const trimmedEmail = email.trim().toLowerCase();

      // Check the target user exists
      const targetUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (!targetUser) throw new Error("No user found with that email");

      // Check not already a member
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId, userId: targetUser.id },
        },
      });
      if (existingMember) throw new Error("User is already a member");

      // Check for existing pending invite
      const existingInvite = await prisma.invite.findFirst({
        where: {
          groupId,
          invitedEmail: trimmedEmail,
          status: "pending",
        },
      });
      if (existingInvite) throw new Error("Invite already sent to this user");

      const invite = await prisma.invite.create({
        data: {
          groupId,
          invitedEmail: trimmedEmail,
          token: randomUUID(),
          inviterId: user.id,
          status: "pending",
        },
      });

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: { include: { user: true } } },
      });

      if (group) {
        sendNotification({
          prisma,
          recipientId: targetUser.id,
          type: "group_invitation",
          title: "Group Invitation",
          body: `${dbUser?.name} invited you to join ${group.name}`,
          data: { groupId: group.id },
        }).catch((err: any) => console.error("Notification error:", err));
      }

      return { ...invite, group };
    },
    respondToInvite: async (
      _: any,
      { inviteId, accept }: any,
      { prisma, user }: any,
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Context only has user.id, so fetch user email from DB
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new Error("User not found");

      const invite = await prisma.invite.findUnique({
        where: { id: inviteId },
      });
      if (!invite || invite.status !== "pending")
        throw new Error("Invalid or already responded invite");
      if (invite.invitedEmail.toLowerCase() !== dbUser.email.toLowerCase())
        throw new Error("This invite is not for you");

      if (accept && invite.groupId) {
        // Add user to group
        const existing = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: { groupId: invite.groupId, userId: user.id },
          },
        });
        if (!existing) {
          await prisma.groupMember.create({
            data: {
              groupId: invite.groupId,
              userId: user.id,
              role: "member",
            },
          });
        }

        // Also add to group conversation
        const group = await prisma.group.findUnique({
          where: { id: invite.groupId },
        });
        if (group?.conversationId) {
          const existingParticipant =
            await prisma.conversationParticipant.findUnique({
              where: {
                conversationId_userId: {
                  conversationId: group.conversationId,
                  userId: user.id,
                },
              },
            });
          if (!existingParticipant) {
            await prisma.conversationParticipant.create({
              data: {
                conversationId: group.conversationId,
                userId: user.id,
                role: "member",
              },
            });
          }
        }

        if (group && dbUser) {
          const groupWithMembers = await prisma.group.findUnique({
            where: { id: group.id },
            include: { members: true },
          });
          if (groupWithMembers) {
            for (const member of groupWithMembers.members) {
              if (member.userId !== user.id) {
                sendNotification({
                  prisma,
                  recipientId: member.userId,
                  type: "user_joined_group",
                  title: "New Member",
                  body: `${dbUser.name} joined ${group.name} by accepting invitation`,
                  data: { groupId: group.id },
                }).catch((err: any) => console.error("Notification error:", err));
              }
            }
          }
        }
      }

      await prisma.invite.update({
        where: { id: inviteId },
        data: { status: accept ? "accepted" : "rejected" },
      });

      return true;
    },
  },
};
