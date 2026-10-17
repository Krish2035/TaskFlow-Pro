import { Router } from "express";
import { z } from "zod";
import { ProjectController } from "../controllers/project.controller";
import { TaskController } from "../controllers/task.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";

export const projectRouter = Router();

projectRouter.use(authenticate);

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueAt: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

projectRouter.get("/:projectId", ProjectController.getProject);
projectRouter.get("/:projectId/tasks", TaskController.listTasks);
projectRouter.post("/:projectId/tasks", validate(createTaskSchema), TaskController.createTask);
