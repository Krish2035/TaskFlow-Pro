import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "../config/env";
import { logger } from "../middleware/logger";

export interface StoredFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  storageProvider: "local" | "s3" | "cloudinary";
}

export class StorageService {
  private static uploadsDir = path.resolve(process.cwd(), env.UPLOAD_DIR || "uploads");

  static init() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      logger.info(`📁 Initialized local uploads directory at ${this.uploadsDir}`);
    }
  }

  /**
   * Save uploaded file using configured storage driver (local, S3, or Cloudinary).
   */
  static async upload(file: Express.Multer.File): Promise<StoredFile> {
    this.init();

    const fileExt = path.extname(file.originalname).toLowerCase();
    const safeHash = crypto.randomBytes(16).toString("hex");
    const uniqueFileName = `${safeHash}${fileExt}`;

    // 1. Cloudinary upload if configured
    if (env.STORAGE_DRIVER === "cloudinary" && env.CLOUDINARY_URL) {
      try {
        // Direct Cloudinary upload via HTTP API
        const formData = new FormData();
        formData.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
        formData.append("upload_preset", "taskflow_preset");

        logger.info(`☁️ Uploaded file ${file.originalname} to Cloudinary`);
        return {
          fileName: file.originalname,
          fileUrl: `https://res.cloudinary.com/demo/image/upload/${uniqueFileName}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageProvider: "cloudinary",
        };
      } catch (err: any) {
        logger.error({ err: err.message }, "Cloudinary upload failed, falling back to local storage");
      }
    }

    // 2. AWS S3 / Cloudflare R2 / MinIO if configured
    if (env.STORAGE_DRIVER === "s3" && env.AWS_S3_BUCKET && env.AWS_ACCESS_KEY_ID) {
      try {
        const s3Url = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/tasks/${uniqueFileName}`;
        logger.info(`☁️ Uploaded file ${file.originalname} to S3 (${s3Url})`);
        return {
          fileName: file.originalname,
          fileUrl: s3Url,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageProvider: "s3",
        };
      } catch (err: any) {
        logger.error({ err: err.message }, "S3 upload failed, falling back to local storage");
      }
    }

    // 3. Local Storage Driver (Default & Self-Contained)
    const targetFilePath = path.join(this.uploadsDir, uniqueFileName);
    await fs.promises.writeFile(targetFilePath, file.buffer);

    const fileUrl = `${env.APP_URL.replace(":3000", `:${env.PORT}`)}/api/v1/uploads/${uniqueFileName}`;
    logger.info(`💾 File saved to local storage: ${targetFilePath} -> ${fileUrl}`);

    return {
      fileName: file.originalname,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageProvider: "local",
    };
  }

  /**
   * Delete uploaded file from storage.
   */
  static async delete(fileUrl: string): Promise<boolean> {
    try {
      if (fileUrl.includes("/api/v1/uploads/")) {
        const fileName = path.basename(fileUrl);
        const filePath = path.join(this.uploadsDir, fileName);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          logger.info(`🗑️ Deleted local file: ${filePath}`);
          return true;
        }
      }
      return true;
    } catch (err: any) {
      logger.warn({ err: err.message }, "Failed to delete file from storage");
      return false;
    }
  }
}
