import { Request, Response, NextFunction } from "express";
import { TaskService } from "../services/task.service";
import { broadcastRealtime } from "../realtime/websocket";

function getAuditContext(req: Request) {
  return {
    actorId: req.user?.userId,
    ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
    userAgent: req.headers["user-agent"] || "TaskFlow-Web/1.0",
  };
}

export class TaskController {
  static async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const task = await TaskService.createTask(req.user!.userId, projectId, req.body, getAuditContext(req));

      broadcastRealtime({
        type: "TASK_CREATED",
        taskId: task.id,
        title: task.title,
        newStatus: task.status,
        priority: task.priority,
        author: req.user?.displayName || "Teammate",
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        message: "Task created successfully",
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;

      const result = await TaskService.listTasks(projectId, { page, limit, status, priority });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await TaskService.getTask(req.params.taskId);
      res.status(200).json({
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const expectedVersion = req.body.version !== undefined ? parseInt(req.body.version, 10) : undefined;
      const updated = await TaskService.updateTask(req.params.taskId, req.body, expectedVersion, getAuditContext(req));

      broadcastRealtime({
        type: "TASK_MOVED",
        taskId: updated.id,
        title: updated.title,
        newStatus: updated.status,
        priority: updated.priority,
        author: req.user?.displayName || "Teammate",
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        message: "Task updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await TaskService.deleteTask(req.params.taskId, true, getAuditContext(req));
      res.status(200).json({
        message: "Task moved to trash (soft deleted)",
        data: deleted,
      });
    } catch (error) {
      next(error);
    }
  }

  static async restoreTask(req: Request, res: Response, next: NextFunction) {
    try {
      const restored = await TaskService.restoreTask(req.params.taskId, getAuditContext(req));
      res.status(200).json({
        message: "Task successfully restored from trash",
        data: restored,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listTrash(req: Request, res: Response, next: NextFunction) {
    try {
      const trash = await TaskService.listTrash(req.params.projectId);
      res.status(200).json({
        data: trash,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const comment = await TaskService.addComment(req.params.taskId, req.user!.userId, req.body.body);
      res.status(201).json({
        message: "Comment added successfully",
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const comments = await TaskService.listComments(req.params.taskId);
      res.status(200).json({
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }
}
