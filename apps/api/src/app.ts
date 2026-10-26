/**
 * Fastify app factory — kept separate from the server entry so tests can
 * inject the app without binding a port.
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import { registry } from "@tatkalpro/observability";
import { registerRoutes } from "./routes/index.js";

export interface BuildAppOptions {
  corsOrigin: string;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: "info",
      redact: ["req.headers.authorization", "password", "*.password", "jwt"],
    },
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(cors, { origin: options.corsOrigin });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(websocket);

  await app.register(swagger, {
    openapi: {
      info: {
        title: "TatkalPro API",
        description: "Self-hosted IRCTC Tatkal booking super-app",
        version: "0.1.0",
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await registerRoutes(app);

  app.get("/metrics", async () => {
    return registry.metrics();
  });

  return app;
}
