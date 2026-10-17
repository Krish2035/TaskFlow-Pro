import { Request, Response, NextFunction } from "express";
import { redis } from "../cache/redis";

/**
 * Idempotency Key Middleware (Stripe-grade duplicate mutation prevention)
 * Checks 'Idempotency-Key' header in Redis for 24-hour replay protection.
 */
export function idempotencyMiddleware(ttlSeconds = 86400) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.header("Idempotency-Key") || req.header("X-Idempotency-Key");

    // Only apply to state-modifying HTTP methods
    if (!idempotencyKey || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return next();
    }

    if (redis.status !== "ready") {
      // Graceful fallback if Redis is temporarily unavailable
      return next();
    }

    const cacheKey = `taskflow:idemp:${req.user?.userId || "anon"}:${idempotencyKey}`;

    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);

        if (parsed.status === "processing") {
          res.status(409).json({
            error: {
              code: "IDEMPOTENCY_IN_PROGRESS",
              message: "A request with this Idempotency-Key is currently processing. Please wait.",
            },
          });
          return;
        }

        if (parsed.status === "completed") {
          res.setHeader("X-Idempotency-Replay", "true");
          res.setHeader("X-Idempotency-Key", idempotencyKey);
          res.status(parsed.statusCode).json(parsed.body);
          return;
        }
      }

      // Mark request as processing
      await redis.set(
        cacheKey,
        JSON.stringify({ status: "processing", startedAt: Date.now() }),
        "EX",
        60 // 60s processing lock
      );

      // Monkey-patch res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        if (res.statusCode < 500) {
          redis
            .set(
              cacheKey,
              JSON.stringify({
                status: "completed",
                statusCode: res.statusCode,
                body,
                cachedAt: new Date().toISOString(),
              }),
              "EX",
              ttlSeconds
            )
            .catch((err) => console.error("⚠️ Failed to cache idempotent response:", err.message));
        } else {
          // If server error occurred, release lock so client can retry
          redis.del(cacheKey).catch(() => {});
        }

        res.setHeader("X-Idempotency-Key", idempotencyKey);
        return originalJson(body);
      };

      next();
    } catch (err: any) {
      console.warn("⚠️ Idempotency check encountered error, passing through:", err.message);
      next();
    }
  };
}
