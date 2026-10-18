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

import { xssSanitizeMiddleware } from "./middleware/sanitize";
import { idempotencyMiddleware } from "./middleware/idempotency";

export const app = express();

// Security and utility middleware with Content-Security-Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "ws://localhost:8080", "http://localhost:8080"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
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

// Rich Text & XSS Sanitization Defense (strips <script>, onerror, etc.)
app.use(xssSanitizeMiddleware);

// Idempotency Key Middleware (prevents double submits on slow networks)
app.use(idempotencyMiddleware());

// HTTP Logging in non-test environment
if (env.NODE_ENV !== "test") {
  app.use(httpLogger);
}

// Probes and Health routes
app.use("/health", healthRouter);

import path from "path";

// Serve uploaded attachments statically
app.use("/api/v1/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR || "uploads")));

// Versioned API v1 Router
app.use("/api/v1", apiV1Router);

// 404 & Global Error handling
app.use(notFoundHandler);
app.use(errorHandler);
