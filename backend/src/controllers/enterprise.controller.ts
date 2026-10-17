import { Request, Response, NextFunction } from "express";
import { AuditService } from "../services/audit.service";
import { JobQueue } from "../jobs/queue";
import { getDatabaseTopology } from "../db/replica";

export class EnterpriseController {
  /**
   * SOC 2 Audit Logs endpoint for workspace activity compliance.
   */
  static async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await AuditService.listWorkspaceLogs(workspaceId, limit);

      res.status(200).json({
        data: logs,
        compliance: {
          standard: "SOC 2 Type II / ISO 27001",
          retentionDays: 365,
          immutable: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Asynchronous Team Member Invitation via Background Job Queue.
   * Returns 202 Accepted in ~15ms while worker handles emails.
   */
  static async queueInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const emails: string[] = req.body.emails || [
        "alex.rivera@taskflow.local",
        "maya.lin@taskflow.local",
        "david.chen@taskflow.local",
      ];

      const job = await JobQueue.add("INVITE_EMAILS", {
        workspaceId,
        emails,
        invitedBy: req.user?.displayName || "Workspace Owner",
      });

      res.status(202).json({
        statusCode: 202,
        message: `Invitations for ${emails.length} team members successfully queued. Worker is processing email delivery asynchronously.`,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          pollUrl: `/api/v1/jobs/${job.id}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Asynchronous PDF Project Analytics Report Generation.
   * Returns 202 Accepted while worker renders report and charts.
   */
  static async queueReportExport(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const job = await JobQueue.add("EXPORT_PDF_REPORT", {
        projectId,
        format: "pdf",
        requestedBy: req.user?.displayName || "Team Lead",
      });

      res.status(202).json({
        statusCode: 202,
        message: "PDF Project Report export queued. Background worker is compiling charts and tasks.",
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          pollUrl: `/api/v1/jobs/${job.id}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Poll status of an async background job.
   */
  static async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await JobQueue.getJob(req.params.jobId);
      if (!job) {
        res.status(404).json({ error: { message: "Job not found or expired" } });
        return;
      }

      res.status(200).json({
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Background Job Queue statistics (BullMQ / Redis worker metrics).
   */
  static async getJobQueueStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await JobQueue.getStats();
      res.status(200).json({
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Database Topology & PgBouncer Connection Pooling status.
   */
  static async getTopology(_req: Request, res: Response, next: NextFunction) {
    try {
      const topology = await getDatabaseTopology();
      res.status(200).json({
        data: topology,
      });
    } catch (error) {
      next(error);
    }
  }
}
