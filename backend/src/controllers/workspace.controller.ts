import { Request, Response, NextFunction } from "express";
import { WorkspaceService } from "../services/workspace.service";

export class WorkspaceController {
  static async createWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await WorkspaceService.createWorkspace(req.user!.userId, req.body);
      res.status(201).json({
        message: "Workspace created successfully",
        data: workspace,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listUserWorkspaces(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaces = await WorkspaceService.listUserWorkspaces(req.user!.userId);
      res.status(200).json({
        data: workspaces,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await WorkspaceService.getWorkspace(req.params.workspaceId, req.user!.userId);
      res.status(200).json({
        data: workspace,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await WorkspaceService.listMembers(req.params.workspaceId);
      res.status(200).json({
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }
}
