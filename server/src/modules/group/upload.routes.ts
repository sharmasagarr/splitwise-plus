import { Router } from "express";
import jwt from "jsonwebtoken";
import { upload } from "../../middleware/upload.js";
import cloudinary from "../../config/cloudinary.js";

const router = Router();

router.post("/group-image", upload.single("file"), async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "splitwise-plus/group-images",
          resource_type: "auto",
          transformation: [
            {
              width: 900,
              height: 900,
              crop: "fill",
              gravity: "auto",
              quality: "auto",
            },
          ],
        },
        (error: any, uploadResult: any) => {
          if (error) reject(error);
          else resolve(uploadResult);
        },
      );

      stream.end(req.file.buffer);
    });

    return res.json({
      imageUrl: result.secure_url,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

export default router;
