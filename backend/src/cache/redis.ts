import Redis from "ioredis";
import { env } from "../config/env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on("error", (err) => {
  if (process.env.NODE_ENV !== "test") {
    console.error("Redis error:", err.message);
  }
});

export async function initRedis(): Promise<void> {
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
  } catch (err: any) {
    console.warn("⚠️ Initial Redis connection failed:", err.message);
  }
}

export async function checkRedisHealth(): Promise<{
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const pong = await redis.ping();
    const latencyMs = Math.round(performance.now() - start);
    if (pong === "PONG") {
      return { status: "up", latencyMs };
    }
    return { status: "down", error: `Unexpected Redis response: ${pong}` };
  } catch (error: any) {
    return {
      status: "down",
      error: error?.message || "Redis connection failed",
    };
  }
}
