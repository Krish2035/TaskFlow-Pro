import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./middleware/logger";
import { pool } from "./db/connections";
import { redis, initRedis } from "./cache/redis";
import { setupRealtimeWebSocket } from "./realtime/websocket";

async function startServer() {
  await initRedis();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 TaskFlow Pro Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`📡 Probes available at http://localhost:${env.PORT}/health/live and http://localhost:${env.PORT}/health/ready`);
    logger.info(`⚡ Live WebSocket server mounted at ws://localhost:${env.PORT}/ws`);
  });

  setupRealtimeWebSocket(server);

  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error("Forcefully shutting down due to timeout");
      process.exit(1);
    }, 10000);

    server.close(async () => {
      logger.info("HTTP server closed.");
      try {
        await pool.end();
        logger.info("PostgreSQL pool drained.");
        await redis.quit();
        logger.info("Redis connection closed.");
      } catch (err: any) {
        logger.error({ err }, "Error while closing database or cache connections");
      } finally {
        clearTimeout(shutdownTimeout);
        logger.info("Graceful shutdown complete.");
        process.exit(0);
      }
    });
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

startServer().catch((err) => {
  logger.fatal({ err }, "Fatal error starting server");
  process.exit(1);
});
