const USERNAME_MAX_LENGTH = 30;

// Similar to Instagram constraints: lowercase letters, digits, dots, underscores.
export const USERNAME_REGEX = /^(?!.*\.\.)(?!.*\.$)[a-z0-9](?:[a-z0-9._]{0,28}[a-z0-9])?$/;

const sanitizeUsername = (input: string) => {
  const lower = (input || "").trim().toLowerCase();
  const cleaned = lower
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "");

  if (!cleaned) return "user";
  return cleaned.slice(0, USERNAME_MAX_LENGTH).replace(/[^a-z0-9]+$/, "") || "user";
};

export const normalizeUsernameInput = (input: string) => sanitizeUsername(input);

export const isValidUsername = (input: string) => {
  const normalized = normalizeUsernameInput(input);
  return normalized === input.trim().toLowerCase() && USERNAME_REGEX.test(normalized);
};

export const buildUsernameBaseFromName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const rawBase =
    parts.length >= 2
      ? `${parts[0]}${parts[parts.length - 1]}`
      : (parts[0] ?? "user");
  return sanitizeUsername(rawBase);
};

export const generateUniqueUsername = async (
  prisma: any,
  baseInput: string,
  excludeUserId?: string,
) => {
  const sanitized = sanitizeUsername(baseInput);

  // Ensure minimum 3 characters by appending "1"s
  const base = sanitized.length < 3
    ? sanitized + '1'.repeat(3 - sanitized.length)
    : sanitized;

  const makeWhere = (candidate: string) =>
    excludeUserId
      ? { username: candidate, id: { not: excludeUserId } }
      : { username: candidate };

  const firstMatch = await prisma.user.findFirst({
    where: makeWhere(base),
    select: { id: true },
  });
  if (!firstMatch) {
    return base;
  }

  for (let suffix = 1; suffix <= 9999; suffix += 1) {
    const suffixText = String(suffix);
    const trimmedBase = base.slice(0, USERNAME_MAX_LENGTH - suffixText.length);
    const candidate = `${trimmedBase}${suffixText}`;

    if (!USERNAME_REGEX.test(candidate)) {
      continue;
    }

    const existing = await prisma.user.findFirst({
      where: makeWhere(candidate),
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique username. Please try again.");
};
