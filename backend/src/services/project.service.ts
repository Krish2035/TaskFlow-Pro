import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/connections";
import { projects } from "../db/schema/projects";
import { tasks } from "../db/schema/tasks";
import { AppError } from "../middleware/error-handler";

export class ProjectService {
  static async createProject(
    userId: string,
    workspaceId: string,
    data: { name: string; description?: string; status?: "active" | "archived" | "completed" }
  ) {
    const [project] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: data.name.trim(),
        description: data.description?.trim(),
        status: data.status || "active",
        createdBy: userId,
      })
      .returning();

    return project;
  }

  static async listProjects(workspaceId: string, options: { page?: number; limit?: number; status?: string } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const baseWhere = options.status
      ? and(eq(projects.workspaceId, workspaceId), eq(projects.status, options.status))
      : eq(projects.workspaceId, workspaceId);

    const [items, [{ count }]] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(baseWhere)
        .orderBy(desc(projects.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(baseWhere),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async getProject(projectId: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new AppError("Project not found", 404, "NOT_FOUND");
    }

    return project;
  }
}
