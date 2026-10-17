import { Request, Response, NextFunction } from "express";
import { ProjectService } from "../services/project.service";

export class ProjectController {
  static async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const project = await ProjectService.createProject(req.user!.userId, workspaceId, req.body);
      res.status(201).json({
        message: "Project created successfully",
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as string | undefined;

      const result = await ProjectService.listProjects(workspaceId, { page, limit, status });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await ProjectService.getProject(req.params.projectId);
      res.status(200).json({
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
}
