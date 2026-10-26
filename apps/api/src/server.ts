/**
 * HTTP server entrypoint.
 */
import { buildApp } from "./app.js";
import { loadEnv } from "@tatkalpro/config";

const env = loadEnv();

const app = await buildApp({ corsOrigin: env.API_CORS_ORIGIN });

try {
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  app.log.info(`TatkalPro API listening on :${env.API_PORT} (docs at /docs)`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
