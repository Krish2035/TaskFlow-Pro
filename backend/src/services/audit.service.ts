import { db } from "../db/connections";
import { activityLogs, users } from "../db/schema";
import { desc, eq } from "drizzle-orm";

export interface CreateAuditLogParams {
  actorId?: string | null;
  workspaceId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Log an immutable state-changing event for SOC 2 compliance.
   */
  static async log(params: CreateAuditLogParams) {
    try {
      const enrichedMetadata = {
        ipAddress: params.ipAddress || "127.0.0.1",
        userAgent: params.userAgent || "TaskFlow/1.0",
        changes: params.changes || null,
        ...(params.metadata || {}),
      };

      const [logEntry] = await db
        .insert(activityLogs)
        .values({
          actorId: params.actorId || null,
          workspaceId: params.workspaceId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          metadata: enrichedMetadata,
          createdAt: new Date(),
        })
        .returning();

      return logEntry;
    } catch (err: any) {
      console.error("⚠️ Failed to write SOC 2 audit log:", err.message);
      return null;
    }
  }

  /**
   * List immutable audit logs for a workspace with pagination.
   */
  static async listWorkspaceLogs(workspaceId: string, limit = 50) {
    const logs = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        resourceType: activityLogs.resourceType,
        resourceId: activityLogs.resourceId,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
        actor: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
        },
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.actorId, users.id))
      .where(eq(activityLogs.workspaceId, workspaceId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    return logs.map((log) => {
      const meta = (log.metadata as Record<string, any>) || {};
      return {
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        actor: log.actor?.displayName ? log.actor : { displayName: "System Worker", email: "system@taskflow.local" },
        ipAddress: meta.ipAddress || "127.0.0.1",
        userAgent: meta.userAgent || "Unknown",
        changes: meta.changes || null,
        metadata: meta,
        timestamp: log.createdAt,
      };
    });
  }
}
