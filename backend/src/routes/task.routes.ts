import { Router } from "express";
import { z } from "zod";
import { TaskController } from "../controllers/task.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";

export const taskRouter = Router();

taskRouter.use(authenticate);

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueAt: z.string().datetime().optional().nullable().transform((val) => (val ? new Date(val) : null)),
  version: z.number().int().optional(),
});

const addCommentSchema = z.object({
  body: z.string().min(1, "Comment body is required"),
});

taskRouter.get("/:taskId", TaskController.getTask);
taskRouter.patch("/:taskId", validate(updateTaskSchema), TaskController.updateTask);
taskRouter.delete("/:taskId", TaskController.deleteTask);
taskRouter.post("/:taskId/restore", TaskController.restoreTask);
taskRouter.get("/:taskId/comments", TaskController.listComments);
taskRouter.post("/:taskId/comments", validate(addCommentSchema), TaskController.addComment);
