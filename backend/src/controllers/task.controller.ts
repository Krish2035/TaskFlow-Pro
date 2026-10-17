import { Request, Response, NextFunction } from "express";
import { TaskService } from "../services/task.service";

export class TaskController {
  static async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const task = await TaskService.createTask(req.user!.userId, projectId, req.body);
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
      const updated = await TaskService.updateTask(req.params.taskId, req.body);
      res.status(200).json({
        message: "Task updated successfully",
        data: updated,
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
