import { Router } from "express";
import { z } from "zod";
import { WorkspaceController } from "../controllers/workspace.controller";
import { ProjectController } from "../controllers/project.controller";
import { authenticate } from "../middleware/authenticate";
import { requireWorkspaceRole } from "../middleware/authorize";
import { validate } from "../middleware/validate";

export const workspaceRouter = Router();

workspaceRouter.use(authenticate);

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters"),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase alphanumeric characters and hyphens"),
});

const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.enum(["active", "archived", "completed"]).optional(),
});

workspaceRouter.get("/", WorkspaceController.listUserWorkspaces);
workspaceRouter.post("/", validate(createWorkspaceSchema), WorkspaceController.createWorkspace);
workspaceRouter.get("/:workspaceId", WorkspaceController.getWorkspace);
workspaceRouter.get("/:workspaceId/members", requireWorkspaceRole("member"), WorkspaceController.listMembers);

// Projects within workspace
workspaceRouter.post(
  "/:workspaceId/projects",
  requireWorkspaceRole("admin"),
  validate(createProjectSchema),
  ProjectController.createProject
);
workspaceRouter.get(
  "/:workspaceId/projects",
  requireWorkspaceRole("member"),
  ProjectController.listProjects
);
