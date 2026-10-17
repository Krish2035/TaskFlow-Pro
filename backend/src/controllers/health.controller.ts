import { Request, Response } from "express";
import { checkDatabaseHealth } from "../db/connections";
import { checkRedisHealth } from "../cache/redis";

export class HealthController {
  static getLive(_req: Request, res: Response) {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }

  static async getReady(_req: Request, res: Response) {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const isReady = dbHealth.status === "up" && redisHealth.status === "up";

    const responsePayload = {
      status: isReady ? "ready" : "degraded",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          status: dbHealth.status,
          latencyMs: dbHealth.latencyMs,
        },
        redis: {
          status: redisHealth.status,
          latencyMs: redisHealth.latencyMs,
        },
      },
    };

    if (!isReady) {
      res.status(503).json(responsePayload);
      return;
    }

    res.status(200).json(responsePayload);
  }

  static getRoot(_req: Request, res: Response) {
    res.status(200).json({
      service: "TaskFlow Pro API",
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  }
}
