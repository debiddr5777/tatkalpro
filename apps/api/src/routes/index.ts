/**
 * Route registration — REST + WebSocket surface.
 */
import type { FastifyInstance } from "fastify";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => {
    return { status: "ok", service: "tatkalpro-api" };
  });

  app.get("/api/ready", async () => {
    // TODO: check postgres + redis connectivity (fail fast on degraded deps)
    return { status: "ready" };
  });

  app.get("/api/journeys", async () => {
    // TODO: list journeys for the authenticated user
    return { journeys: [] };
  });

  app.post("/api/journeys/:id/arm", async (request, reply) => {
    // TODO: schedule pre-flight jobs at T-0 via the booking queue
    void request;
    return reply.code(202).send({ status: "armed" });
  });

  app.post("/api/journeys/:id/disarm", async (request, reply) => {
    void request;
    return reply.code(202).send({ status: "disarmed" });
  });

  app.get("/ws", { websocket: true }, (socket) => {
    // TODO: subscribe to Redis pub/sub journey events and forward typed WsEvents
    socket.on("message", (raw) => {
      socket.send(JSON.stringify({ echo: raw.toString() }));
    });
  });
}
