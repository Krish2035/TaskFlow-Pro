import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/connections";
import { tasks } from "../db/schema/tasks";
import { taskAssignees } from "../db/schema/taskAssignees";
import { comments } from "../db/schema/comments";
import { users } from "../db/schema/users";
import { AppError } from "../middleware/error-handler";

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
    }
  ) {
    return await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(tasks)
        .values({
          projectId,
          title: data.title.trim(),
          description: data.description?.trim(),
          status: data.status || "todo",
          priority: data.priority || "medium",
          dueAt: data.dueAt || null,
          createdBy: userId,
        })
        .returning();

      if (data.assigneeIds && data.assigneeIds.length > 0) {
        await tx.insert(taskAssignees).values(
          data.assigneeIds.map((assigneeId) => ({
            taskId: task.id,
            userId: assigneeId,
          }))
        );
      }

      return task;
    });
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

    const conditions = [eq(tasks.projectId, projectId)];
    if (options.status) conditions.push(eq(tasks.status, options.status as any));
    if (options.priority) conditions.push(eq(tasks.priority, options.priority as any));

    const whereClause = and(...conditions);

    const [items, [{ count }]] = await Promise.all([
      db
        .select()
        .from(tasks)
        .where(whereClause)
        .orderBy(desc(tasks.createdAt), desc(tasks.id))
        .limit(limit)
        .offset(offset),
      db
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
  }

  static async getTask(taskId: string) {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new AppError("Task not found", 404, "NOT_FOUND");
    }

    const assignees = await db
      .select({
        taskId: taskAssignees.taskId,
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        assignedAt: taskAssignees.assignedAt,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId));

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
    }
  ) {
    const [updated] = await db
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updated) {
      throw new AppError("Task not found", 404, "NOT_FOUND");
    }

    return updated;
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
    return await db
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
      .orderBy(desc(comments.createdAt));
  }
}
