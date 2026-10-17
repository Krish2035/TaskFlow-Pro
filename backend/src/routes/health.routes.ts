import { Router } from "express";
import { HealthController } from "../controllers/health.controller";

export const healthRouter = Router();

healthRouter.get("/live", HealthController.getLive);
healthRouter.get("/ready", HealthController.getReady);
healthRouter.get("/", HealthController.getRoot);
