import { Router } from "express";
import jwt from "jsonwebtoken";
import { upload } from "../../middleware/upload.js";
import cloudinary from "../../config/cloudinary.js";
import { prisma } from "../../db/index.js";

const router = Router();

// POST /api/upload/expense-attachment
router.post(
  "/expense-attachment",
  upload.single("file"),
  async (req: any, res: any) => {
    try {

      // Verify JWT
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        console.warn("❌ Missing/invalid auth header");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.replace("Bearer ", "");
      let userId: string;
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = payload.userId;
      } catch {
        console.error("❌ JWT verification failed");
        return res.status(401).json({ error: "Invalid token" });
      }

      // Get expenseId from body or fields (handle different FormData parsing)
      const expenseId = req.body.expenseId || req.body?.expenseId?.[0];
      if (!expenseId) {
        console.warn("❌ Missing expenseId:", {
          body: req.body,
          fields: req.fields,
        });
        return res.status(400).json({ error: "expenseId is required" });
      }

      if (!req.file) {
        console.warn("❌ No file in multipart request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Verify the user is a participant of this expense
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
        include: { shares: true },
      });

      if (!expense) {
        console.warn("❌ Expense not found:", expenseId);
        return res.status(404).json({ error: "Expense not found" });
      }

      const isParticipant =
        expense.createdById === userId ||
        expense.shares.some((s: any) => s.userId === userId);
      if (!isParticipant) {
        console.warn("❌ User not authorized for expense:", { userId, expenseId });
        return res.status(403).json({ error: "Not authorized" });
      }

      // Upload to Cloudinary via stream
      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "splitwise-plus/expense-attachments",
            resource_type: "auto",
          },
          (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });

      // Create DB record
      const attachment = await prisma.expenseAttachment.create({
        data: {
          expenseId,
          uploadedBy: userId,
          url: result.secure_url,
          filename: req.file.originalname || null,
          size: req.file.size || null,
          contentType: req.file.mimetype || null,
        },
      });

      // Update receipt count
      await prisma.expense.update({
        where: { id: expenseId },
        data: { receiptCount: { increment: 1 } },
      });

      return res.json({ attachment });
    } catch (error: any) {
      console.error("❌ Upload error:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
        fileSize: req.file?.size,
        contentType: req.file?.mimetype,
      });
      return res.status(500).json({ error: "Upload failed: " + error.message });
    }
  },
);

export default router;
