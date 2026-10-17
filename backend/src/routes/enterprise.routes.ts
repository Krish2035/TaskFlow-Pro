import { Router } from "express";
import { EnterpriseController } from "../controllers/enterprise.controller";
import { authenticate } from "../middleware/authenticate";

export const enterpriseRouter = Router();

// Public/System routes
enterpriseRouter.get("/system/topology", EnterpriseController.getTopology);
enterpriseRouter.get("/jobs/stats", EnterpriseController.getJobQueueStats);
enterpriseRouter.get("/jobs/:jobId", EnterpriseController.getJobStatus);

// Protected enterprise routes
enterpriseRouter.use(authenticate);
enterpriseRouter.get("/workspaces/:workspaceId/audit-logs", EnterpriseController.listAuditLogs);
enterpriseRouter.post("/workspaces/:workspaceId/invitations/async", EnterpriseController.queueInvitations);
enterpriseRouter.post("/projects/:projectId/export-report/async", EnterpriseController.queueReportExport);
