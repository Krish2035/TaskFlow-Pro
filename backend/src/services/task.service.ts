import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/connections";
import { withReadReplica } from "../db/replica";
import { tasks } from "../db/schema/tasks";
import { taskAssignees } from "../db/schema/taskAssignees";
import { comments } from "../db/schema/comments";
import { users } from "../db/schema/users";
import { projects } from "../db/schema/projects";
import { AppError } from "../middleware/error-handler";
import { AuditService } from "./audit.service";

export interface AuditContext {
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TaskService {
  static async createTask(
    userId: string,
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: "todo" | "in_progress" | "in_review" | "done" | "archived";
      priority?: "low" | "medium" | "high" | "urgent";
      dueAt?: Date | null;
      assigneeIds?: string[];
    },
    auditContext?: AuditContext
  ) {
    const task = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tasks)
        .values({
          projectId,
          title: data.title.trim(),
          description: data.description?.trim(),
          status: data.status || "todo",
          priority: data.priority || "medium",
          dueAt: data.dueAt || null,
          createdBy: userId,
          version: 1,
        })
        .returning();

      if (data.assigneeIds && data.assigneeIds.length > 0) {
        await tx.insert(taskAssignees).values(
          data.assigneeIds.map((assigneeId) => ({
            taskId: created.id,
            userId: assigneeId,
          }))
        );
      }

      return created;
    });

    // Resolve workspaceId for SOC 2 audit logging
    const [project] = await db.select({ workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, projectId));
    if (project) {
      await AuditService.log({
        actorId: userId,
        workspaceId: project.workspaceId,
        action: "task.created",
        resourceType: "task",
        resourceId: task.id,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
        changes: { title: task.title, status: task.status, priority: task.priority },
        metadata: { projectId },
      });
    }

    return task;
  }

  static async listTasks(
    projectId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(tasks.projectId, projectId), sql`${tasks.deletedAt} IS NULL`];
    if (options.status) conditions.push(eq(tasks.status, options.status as any));
    if (options.priority) conditions.push(eq(tasks.priority, options.priority as any));

    const whereClause = and(...conditions);

    // Route high-volume Kanban read queries through Read Replica pool
    return await withReadReplica(async (client) => {
      const [items, [{ count }]] = await Promise.all([
        client
          .select()
          .from(tasks)
          .where(whereClause)
          .orderBy(desc(tasks.createdAt), desc(tasks.id))
          .limit(limit)
          .offset(offset),
        client
          .select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(whereClause),
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
    });
  }

  static async getTask(taskId: string) {
    const [task] = await withReadReplica(async (client) =>
      client
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), sql`${tasks.deletedAt} IS NULL`))
    );

    if (!task) {
      throw new AppError("Task not found", 404, "NOT_FOUND");
    }

    const assignees = await withReadReplica(async (client) =>
      client
        .select({
          taskId: taskAssignees.taskId,
          userId: users.id,
          displayName: users.displayName,
          email: users.email,
          assignedAt: taskAssignees.assignedAt,
        })
        .from(taskAssignees)
        .innerJoin(users, eq(taskAssignees.userId, users.id))
        .where(eq(taskAssignees.taskId, taskId))
    );

    return {
      ...task,
      assignees,
    };
  }

  static async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: "todo" | "in_progress" | "in_review" | "done" | "archived";
      priority?: "low" | "medium" | "high" | "urgent";
      dueAt?: Date | null;
    },
    expectedVersion?: number,
    auditContext?: AuditContext
  ) {
    // 1. Fetch current task to inspect before state and check existence
    const [current] = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        version: tasks.version,
      })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), sql`${tasks.deletedAt} IS NULL`));

    if (!current) {
      throw new AppError("Task not found or was moved to trash", 404, "NOT_FOUND");
    }

    // 2. Concurrency Conflict Check (Optimistic Locking)
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new AppError(
        `Concurrency Conflict: Task was modified by another teammate (your version: ${expectedVersion}, latest version: ${current.version}). Please refresh to avoid overwriting teammate changes.`,
        409,
        "CONCURRENCY_CONFLICT"
      );
    }

    const conditions = [eq(tasks.id, taskId), sql`${tasks.deletedAt} IS NULL`];
    if (expectedVersion !== undefined) {
      conditions.push(eq(tasks.version, expectedVersion));
    }

    const [updated] = await db
      .update(tasks)
      .set({
        ...data,
        version: sql`${tasks.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    if (!updated) {
      throw new AppError(
        "Concurrency Conflict: This task was modified concurrently by another teammate.",
        409,
        "CONCURRENCY_CONFLICT"
      );
    }

    // 3. Write immutable SOC 2 Audit Log
    const [project] = await db.select({ workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, current.projectId));
    if (project) {
      await AuditService.log({
        actorId: auditContext?.actorId,
        workspaceId: project.workspaceId,
        action: data.status && data.status !== current.status ? "task.status_changed" : "task.updated",
        resourceType: "task",
        resourceId: taskId,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
        changes: {
          before: { title: current.title, status: current.status, priority: current.priority, version: current.version },
          after: { title: updated.title, status: updated.status, priority: updated.priority, version: updated.version },
        },
      });
    }

    return updated;
  }

  static async deleteTask(taskId: string, soft = true, auditContext?: AuditContext) {
    if (soft) {
      const [deleted] = await db
        .update(tasks)
        .set({ deletedAt: new Date() })
        .where(and(eq(tasks.id, taskId), sql`${tasks.deletedAt} IS NULL`))
        .returning();

      if (!deleted) {
        throw new AppError("Task not found or already deleted", 404, "NOT_FOUND");
      }

      const [project] = await db.select({ workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, deleted.projectId));
      if (project) {
        await AuditService.log({
          actorId: auditContext?.actorId,
          workspaceId: project.workspaceId,
          action: "task.soft_deleted",
          resourceType: "task",
          resourceId: taskId,
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
          changes: { deletedAt: deleted.deletedAt, title: deleted.title },
        });
      }

      return deleted;
    }

    return await db.delete(tasks).where(eq(tasks.id, taskId)).returning();
  }

  static async restoreTask(taskId: string, auditContext?: AuditContext) {
    const [restored] = await db
      .update(tasks)
      .set({ deletedAt: null })
      .where(and(eq(tasks.id, taskId), sql`${tasks.deletedAt} IS NOT NULL`))
      .returning();

    if (!restored) {
      throw new AppError("Task not found in trash", 404, "NOT_FOUND");
    }

    const [project] = await db.select({ workspaceId: projects.workspaceId }).from(projects).where(eq(projects.id, restored.projectId));
    if (project) {
      await AuditService.log({
        actorId: auditContext?.actorId,
        workspaceId: project.workspaceId,
        action: "task.restored",
        resourceType: "task",
        resourceId: taskId,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
        changes: { restoredAt: new Date().toISOString(), title: restored.title },
      });
    }

    return restored;
  }

  static async listTrash(projectId: string) {
    return await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), sql`${tasks.deletedAt} IS NOT NULL`))
      .orderBy(desc(tasks.updatedAt));
  }

  static async addComment(taskId: string, userId: string, body: string) {
    const [comment] = await db
      .insert(comments)
      .values({
        taskId,
        authorId: userId,
        body: body.trim(),
      })
      .returning();

    return comment;
  }

  static async listComments(taskId: string) {
    return await withReadReplica(async (client) =>
      client
        .select({
          id: comments.id,
          body: comments.body,
          createdAt: comments.createdAt,
          author: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.taskId, taskId))
        .orderBy(desc(comments.createdAt))
    );
  }
}
