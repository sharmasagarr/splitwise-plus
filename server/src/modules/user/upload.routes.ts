import { Router } from "express";
import jwt from "jsonwebtoken";
import { upload } from "../../middleware/upload.js";
import cloudinary from "../../config/cloudinary.js";
import { prisma } from "../../db/index.js";

const router = Router();

// POST /api/upload/profile-picture
router.post(
  "/profile-picture",
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

      if (!req.file) {
        console.warn("❌ No file in multipart request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file is an image
      if (!req.file.mimetype.startsWith("image/")) {
        console.warn("❌ File is not an image:", req.file.mimetype);
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      // Upload to Cloudinary via stream
      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "splitwise-plus/profile-pictures",
            resource_type: "auto",
            transformation: [
              {
                width: 500,
                height: 500,
                crop: "fill",
                gravity: "face",
                quality: "auto",
              },
            ],
          },
          (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });

      // Update user profile with new image URL
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { imageUrl: result.secure_url },
      });

      return res.json({ 
        imageUrl: result.secure_url,
        user: updatedUser 
      });
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
