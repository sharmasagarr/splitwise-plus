export const getUserCurrency = async (prisma: any, userId: string) => {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });

  if (!actor?.currency) {
    throw new Error("User currency not configured");
  }

  return actor.currency;
};