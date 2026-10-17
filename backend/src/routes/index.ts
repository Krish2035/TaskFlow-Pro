import { Router } from "express";
import { authRouter } from "./auth.routes";
import { workspaceRouter } from "./workspace.routes";
import { projectRouter } from "./project.routes";
import { taskRouter } from "./task.routes";

export const apiV1Router = Router();

apiV1Router.get("/", (_req, res) => {
  res.json({
    message: "TaskFlow Pro API v1",
    documentation: "/api/v1/docs",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/v1/auth",
      workspaces: "/api/v1/workspaces",
      projects: "/api/v1/projects",
      tasks: "/api/v1/tasks",
    },
  });
});

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/workspaces", workspaceRouter);
apiV1Router.use("/projects", projectRouter);
apiV1Router.use("/tasks", taskRouter);
