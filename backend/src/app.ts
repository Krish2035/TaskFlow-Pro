import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestIdMiddleware } from "./middleware/request-id";
import { httpLogger } from "./middleware/logger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { healthRouter } from "./routes/health.routes";
import { apiV1Router } from "./routes";

export const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: [env.CORS_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(requestIdMiddleware);

// HTTP Logging in non-test environment
if (env.NODE_ENV !== "test") {
  app.use(httpLogger);
}

// Probes and Health routes
app.use("/health", healthRouter);

// Versioned API v1 Router
app.use("/api/v1", apiV1Router);

// 404 & Global Error handling
app.use(notFoundHandler);
app.use(errorHandler);
