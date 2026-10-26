import { describe, expect, it } from "vitest";
import { loadEnv } from "./index.js";

const validEnv = {
  ENCRYPTION_KEY: "a".repeat(64),
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "x".repeat(32),
};

describe("loadEnv", () => {
  it("accepts a valid env and applies defaults", () => {
    const env = loadEnv(validEnv);
    expect(env.MOCK_IRCTC).toBe(true);
    expect(env.API_PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects a short encryption key", () => {
    expect(() => loadEnv({ ...validEnv, ENCRYPTION_KEY: "tooshort" })).toThrow(/ENCRYPTION_KEY/);
  });

  it("rejects missing required values", () => {
    expect(() => loadEnv({ ENCRYPTION_KEY: "a".repeat(64) })).toThrow(/Invalid environment configuration/);
  });
});
