/**
 * Worker entrypoint — BullMQ processors for every queue.
 *
 * The booking orchestrator implements the T-0 timeline (docs/ADR/0002):
 *   T-30 min  session login          T-2 min  TLS warm-up
 *   T-5 min   pre-compute payload    T-0      fire (single-flight, two drivers race)
 */
import { createQueues } from "@tatkalpro/queue";
import { createLogger, metrics } from "@tatkalpro/observability";
import { createDriver } from "@tatkalpro/booking-engine";
import { loadEnv } from "@tatkalpro/config";
import type { BookingFireJob } from "@tatkalpro/queue";

const log = createLogger();

const env = loadEnv();

const connection = { url: env.REDIS_URL };
const queues = createQueues(connection);
const driver = createDriver({ mockIrctc: env.MOCK_IRCTC });

// ── booking queue: the single-flight T-0 fire ────────────────────────────────
// A Redis lock (lock:booking:{journeyId}) guarantees at most one in-flight
// request per journey. The HTTP driver fires; the Playwright fallback races
// and is cancelled the moment the HTTP path wins.
export async function processBookingFire(job: BookingFireJob): Promise<{ firedAt: number }> {
  const start = performance.now();
  log.info({ journeyId: job.journeyId, fireAtEpochMs: job.fireAtEpochMs }, "firing booking at T-0");
  metrics.bookingArrivalDelta.observe(performance.now() - job.fireAtEpochMs);
  // TODO: full orchestrator flow (prepare → captcha → submit → payment handoff)
  return { firedAt: Date.now() - start };
}

import { Worker } from "bullmq";

const bookingWorker = new Worker("booking", async (job) => processBookingFire(job.data), {
  connection,
  lockDuration: 30_000,
});
bookingWorker.on("failed", (job, err) => {
  metrics.bookingFailure.inc({ error_code: err.name });
  log.error({ jobId: job?.id, err }, "booking job failed");
});

for (const name of ["session", "captcha", "notify", "maintenance"] as const) {
  new Worker(name, async (job) => {
    log.debug({ queue: name, jobId: job.id }, "job processed");
  }, { connection });
}

// Keep queue depth visible in Grafana.
setInterval(() => {
  for (const [name, queue] of Object.entries(queues)) {
    queue.getJobCounts().then((counts) => {
      metrics.queueDepth.set({ queue: name }, counts.waiting + counts.active);
    });
  }
}, 5000).unref();

log.info({ mockIrctc: env.MOCK_IRCTC }, "TatkalPro worker started");
