/**
 * Environment configuration, parsed and validated with Zod at startup.
 *
 * The process refuses to boot with invalid or missing config — running with
 * half-configured secrets is worse than not running at all.
 */
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),

  /** When true, all IRCTC calls go through the recorded MockDriver (offline). */
  MOCK_IRCTC: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),

  /** 32-byte hex key for AES-256-GCM credential encryption at rest. */
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/, "ENCRYPTION_KEY must be 64 hex chars (openssl rand -hex 32)"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32),

  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_WS_URL: z.string().default("ws://localhost:4000/ws"),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("http://localhost:4318"),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parse process.env into a typed, validated config object. Throws on invalid config. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration → ${issues}`);
  }
  return result.data;
}
