/**
 * Clock port.
 *
 * All time logic in the codebase goes through this interface so tests can
 * freeze time and simulate T-0 exactly. Never call `Date.now()` directly in
 * domain code — inject a `Clock`.
 */
export interface Clock {
  /** Current time in milliseconds since the epoch. */
  nowMs(): number;
  /** Current ISO-8601 timestamp. */
  nowIso(): string;
  /** Milliseconds remaining until the given epoch timestamp (negative if past). */
  untilMs(targetEpochMs: number): number;
}

/** Production clock backed by the real system time. */
export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
  nowIso(): string {
    return new Date().toISOString();
  }
  untilMs(targetEpochMs: number): number {
    return targetEpochMs - Date.now();
  }
}

/** Deterministic clock for tests. */
export class FakeClock implements Clock {
  private current: number;
  constructor(epochMs: number) {
    this.current = epochMs;
  }
  nowMs(): number {
    return this.current;
  }
  nowIso(): string {
    return new Date(this.current).toISOString();
  }
  untilMs(targetEpochMs: number): number {
    return targetEpochMs - this.current;
  }
  /** Advance the fake clock by the given milliseconds. */
  advance(ms: number): void {
    this.current += ms;
  }
}
