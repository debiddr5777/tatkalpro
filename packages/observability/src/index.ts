/**
 * Observability: structured logging + Prometheus metrics + OpenTelemetry.
 *
 * Every booking attempt, captcha solve, and queue depth is a metric; every
 * request is a trace. Secrets never reach logs — the redact list below.
 */
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from "prom-client";
import pino from "pino";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const metrics = {
  bookingAttemptDuration: new Histogram({
    name: "tatkalpro_booking_attempt_duration_seconds",
    help: "Booking attempt duration by stage",
    labelNames: ["stage"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  }),
  bookingArrivalDelta: new Histogram({
    name: "tatkalpro_booking_arrival_delta_ms",
    help: "Request arrival time vs T-0 in ms — lower is better",
    buckets: [-200, -100, -50, 0, 50, 100, 250, 500, 1000],
    registers: [registry],
  }),
  bookingSuccess: new Counter({
    name: "tatkalpro_booking_success_total",
    help: "Confirmed bookings",
    registers: [registry],
  }),
  bookingFailure: new Counter({
    name: "tatkalpro_booking_failure_total",
    help: "Failed booking attempts by error code",
    labelNames: ["error_code"],
    registers: [registry],
  }),
  captchaAccuracy: new Gauge({
    name: "tatkalpro_captcha_accuracy_ratio",
    help: "Rolling captcha OCR accuracy (0–1)",
    registers: [registry],
  }),
  captchaSolveDuration: new Histogram({
    name: "tatkalpro_captcha_solve_duration_seconds",
    help: "Captcha solve latency",
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [registry],
  }),
  activeSessions: new Gauge({
    name: "tatkalpro_session_active_count",
    help: "Active IRCTC sessions",
    registers: [registry],
  }),
  queueDepth: new Gauge({
    name: "tatkalpro_queue_depth",
    help: "BullMQ queue depth",
    labelNames: ["queue"],
    registers: [registry],
  }),
  httpRtt: new Histogram({
    name: "tatkalpro_http_rtt_ms",
    help: "Round-trip time to IRCTC",
    buckets: [10, 25, 50, 100, 250, 500, 1000],
    registers: [registry],
  }),
};

/** pino logger with secret redaction. Never add credentials to the redact list manually — it's global. */
export function createLogger(level = "info"): pino.Logger {
  return pino({
    level,
    redact: {
      paths: [
        "password",
        "*.password",
        "jwt",
        "*.jwt",
        "aadhaar_token",
        "encryptedPassword",
        "*.encryptedPassword",
      ],
      censor: "[REDACTED]",
    },
  });
}
