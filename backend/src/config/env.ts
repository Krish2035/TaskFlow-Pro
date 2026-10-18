import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("8080").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().default("postgresql://taskflow:taskflow_secret_pass@localhost:5432/taskflow"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET must be at least 16 chars")
    .default("taskflow_dev_jwt_access_secret_key_32_chars!"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 chars")
    .default("taskflow_dev_jwt_refresh_secret_key_32_chars!"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  EMAIL_FROM: z.string().default("TaskFlow Pro <notifications@taskflow.dev>"),
  APP_URL: z.string().default("http://localhost:3000"),
  // Stripe Billing & Subscriptions
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().default("price_pro_monthly"),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().default("price_enterprise_monthly"),
  // Cloud & Local Storage
  STORAGE_DRIVER: z.enum(["local", "s3", "cloudinary"]).default("local"),
  UPLOAD_DIR: z.string().default("uploads"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  CLOUDINARY_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
