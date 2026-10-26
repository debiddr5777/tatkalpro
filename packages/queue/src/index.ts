/**
 * BullMQ queues.
 *
 * Queues and their retry policy live here — the only place in the codebase
 * that knows about BullMQ. Millisecond-precision `delayed` jobs are what make
 * the T-0 fire exact; the fire job is added with `delay: untilMs(T0 - skew - jitter)`.
 */
import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import type { Journey } from "@tatkalpro/contracts";

export const QUEUE_NAMES = ["session", "booking", "captcha", "notify", "maintenance"] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

/** Shared retry policy: exponential backoff with jittered base, capped at 3 attempts. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 250 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
} as const;

export interface BookingFireJob {
  journeyId: string;
  /** Absolute epoch ms the request must hit the wire. Computed at arm time. */
  fireAtEpochMs: number;
  /** Small random 20–80 ms offset to avoid thundering-herd collisions. */
  jitterMs: number;
}

export interface SessionJob {
  irctcAccountId: string;
  journeyId?: string;
}

export interface CaptchaJob {
  sessionId: string;
  stage: "login" | "review";
  imageB64: string;
}

export function createQueues(connection: ConnectionOptions): Record<QueueName, Queue> {
  return {
    session: new Queue<SessionJob>("session", { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    booking: new Queue<BookingFireJob>("booking", { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    captcha: new Queue<CaptchaJob>("captcha", { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    notify: new Queue("notify", { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    maintenance: new Queue("maintenance", { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
  };
}

/** Compute the exact fire time: T-0 minus measured server clock skew minus jitter. */
export function computeFireTime(targetOpenEpochMs: number, clockSkewMs: number): BookingFireJob {
  const jitterMs = 20 + Math.floor(Math.random() * 60); // 20–80 ms
  const fireAtEpochMs = targetOpenEpochMs - clockSkewMs - jitterMs;
  return { journeyId: "", fireAtEpochMs, jitterMs };
}

export type { Journey };
