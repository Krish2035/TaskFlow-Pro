import { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";
import { db } from "../db/connections";
import { workspaceMembers } from "../db/schema/workspaceMembers";
import { eq, and } from "drizzle-orm";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

const roleHierarchy: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function requirePlatformRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return next(new AppError("Forbidden: Insufficient platform permissions", 403, "FORBIDDEN"));
    }

    next();
  };
}

export function requireWorkspaceRole(minimumRole: WorkspaceRole) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
      }

      const workspaceId = req.params.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        return next(new AppError("Workspace ID required for authorization", 400, "BAD_REQUEST"));
      }

      const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, req.user.userId)
          )
        )
        .limit(1);

      if (!member) {
        return next(new AppError("You are not a member of this workspace", 403, "FORBIDDEN"));
      }

      const userRole = member.role as WorkspaceRole;
      if ((roleHierarchy[userRole] ?? 0) < roleHierarchy[minimumRole]) {
        return next(
          new AppError(`Forbidden: Requires at least '${minimumRole}' role`, 403, "FORBIDDEN")
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
