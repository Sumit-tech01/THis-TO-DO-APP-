import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive({ message: "PORT must be a positive number" }),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET is required and must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET is required and must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SENDGRID_API_KEY: z.string().min(1, "SENDGRID_API_KEY is required"),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email"),
  APP_NAME: z.string().min(1, "APP_NAME is required"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Environment validation failed:\n${issues}`);
}

export const env = parsedEnv.data;
