import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index";
import { env } from "../config/env";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export const db = drizzle(pool, { schema });

export async function checkDatabaseHealth(): Promise<{
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      const latencyMs = Math.round(performance.now() - start);
      return { status: "up", latencyMs };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      status: "down",
      error: error?.message || "Database connection failed",
    };
  }
}
