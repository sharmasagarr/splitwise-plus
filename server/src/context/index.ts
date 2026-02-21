import jwt from "jsonwebtoken";
import { prisma } from "../db/index.js";

export async function buildContext({ req }: any) {
  const authHeader = req.headers.authorization;
  let user = null;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.replace("Bearer ", "");
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      user = { id: payload.userId };
    } catch {
      user = null;
    }
  }

  return {
    prisma,
    user,
  };
}
