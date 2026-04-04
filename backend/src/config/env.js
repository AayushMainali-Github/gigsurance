const { z } = require("zod");

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ML_API_BASE_URL: z.string().url().default("http://127.0.0.1:8000"),
  ENABLE_SCHEDULER: z.string().default("true"),
  JOB_LOCK_STALE_MS: z.string().default("900000"),
  JOB_MAX_RETRIES: z.string().default("2")
});

const parsed = envSchema.parse(process.env);

const config = {
  port: Number(parsed.PORT),
  nodeEnv: parsed.NODE_ENV,
  mongoUri: parsed.MONGO_URI,
  dbName: parsed.DB_NAME,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  mlApiBaseUrl: parsed.ML_API_BASE_URL,
  enableScheduler: parsed.ENABLE_SCHEDULER === "true",
  jobLockStaleMs: Number(parsed.JOB_LOCK_STALE_MS),
  jobMaxRetries: Number(parsed.JOB_MAX_RETRIES)
};

module.exports = { config };
