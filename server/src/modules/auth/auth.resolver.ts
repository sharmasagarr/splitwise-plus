import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const authResolvers = {
  Mutation: {
    signup: async (_: any, { name, email, password }: any, { prisma }: any) => {
      // 1. Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        throw new Error("User already exists with this email");
      }

      // 2. Hash password
      const hash = await bcrypt.hash(password, 10);

      // 3. Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: hash,
        },
      });

      // 4. Issue JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return { token, user };
    },

    login: async (_: any, { email, password }: any, { prisma }: any) => {
      // 1. Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) {
        throw new Error("Invalid email or password");
      }

      // 2. Compare password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new Error("Invalid email or password");
      }

      // 3. Issue JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return { token, user };
    },
  },
};
