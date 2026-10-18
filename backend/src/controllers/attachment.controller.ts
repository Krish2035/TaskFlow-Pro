import { Request, Response, NextFunction } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/connections";
import { taskAttachments } from "../db/schema/taskAttachments";
import { tasks } from "../db/schema/tasks";
import { StorageService } from "../services/storage.service";
import { AppError } from "../middleware/error-handler";

export class AttachmentController {
  /**
   * Upload an attachment to a task.
   */
  static async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId;
      const file = req.file;

      if (!file) {
        throw new AppError("No file uploaded", 400, "FILE_REQUIRED");
      }

      // Verify task exists
      const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!task) {
        throw new AppError("Task not found", 404, "NOT_FOUND");
      }

      // Save file via configured storage driver (S3, Cloudinary, or Local)
      const stored = await StorageService.upload(file);

      // Save metadata to database
      const [attachment] = await db
        .insert(taskAttachments)
        .values({
          taskId,
          fileName: stored.fileName,
          fileUrl: stored.fileUrl,
          fileSize: stored.fileSize,
          mimeType: stored.mimeType,
          storageProvider: stored.storageProvider,
          uploadedBy: req.user!.userId,
        })
        .returning();

      res.status(201).json({
        message: "File attachment uploaded successfully",
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all attachments for a task.
   */
  static async listAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId;
      const attachments = await db
        .select()
        .from(taskAttachments)
        .where(eq(taskAttachments.taskId, taskId))
        .orderBy(desc(taskAttachments.createdAt));

      res.status(200).json({ data: attachments });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an attachment from task and storage.
   */
  static async deleteAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId, attachmentId } = req.params;

      const [attachment] = await db
        .select()
        .from(taskAttachments)
        .where(and(eq(taskAttachments.id, attachmentId), eq(taskAttachments.taskId, taskId)))
        .limit(1);

      if (!attachment) {
        throw new AppError("Attachment not found", 404, "NOT_FOUND");
      }

      // Delete from storage
      await StorageService.delete(attachment.fileUrl);

      // Delete from database
      await db.delete(taskAttachments).where(eq(taskAttachments.id, attachmentId));

      res.status(200).json({
        message: "Attachment deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
