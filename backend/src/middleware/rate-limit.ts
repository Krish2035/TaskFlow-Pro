import { Request, Response, NextFunction } from "express";
import { redis } from "../cache/redis";
import { AppError } from "./error-handler";

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  prefix?: string;
  keyGenerator?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowSeconds,
    maxRequests,
    prefix = "rl",
    keyGenerator = (req: Request) => {
      // Prioritize authenticated user ID, fallback to client IP
      return req.user?.userId || req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
    },
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip rate limiting in test environments
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const identifier = keyGenerator(req);
    const key = `${prefix}:${identifier}`;

    try {
      if (redis.status !== "ready") {
        // Fail-open gracefully if redis is temporarily offline
        return next();
      }

      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current));
      res.setHeader("X-RateLimit-Reset", ttl > 0 ? ttl : windowSeconds);

      if (current > maxRequests) {
        return next(
          new AppError(
            "Too many requests, please slow down and try again later",
            429,
            "RATE_LIMIT_EXCEEDED"
          )
        );
      }

      next();
    } catch {
      // Fail open so rate limiter never breaks core API during cache errors
      next();
    }
  };
}
