import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./connections";
import { logger } from "../middleware/logger";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  logger.info("⏳ Running database migrations...");
  try {
    const migrationsFolder = path.join(__dirname, "migrations");
    await migrate(db, { migrationsFolder });
    logger.info("✅ Database migrations applied successfully!");
  } catch (error: any) {
    logger.error({ error }, "❌ Database migration failed");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
