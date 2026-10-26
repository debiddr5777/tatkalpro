/**
 * Journey lifecycle state machine.
 *
 * The allowed transitions are the single source of truth for the booking
 * orchestrator. Illegal transitions throw — they are bugs, not runtime errors.
 */
import type { JourneyStatus } from "@tatkalpro/contracts";

const TRANSITIONS: Record<JourneyStatus, readonly JourneyStatus[]> = {
  DRAFT: ["ARMED", "FAILED"],
  ARMED: ["RUNNING", "DRAFT", "FAILED"],
  RUNNING: ["CAPTCHA_SOLVE", "BOOKING_FORM_SUBMIT", "FAILED"],
  CAPTCHA_SOLVE: ["BOOKING_FORM_SUBMIT", "FAILED"],
  BOOKING_FORM_SUBMIT: ["PAYMENT_PENDING", "WAITLIST", "FAILED"],
  PAYMENT_PENDING: ["BOOKED", "FAILED"],
  BOOKED: [],
  WAITLIST: ["BOOKED", "FAILED"],
  FAILED: [],
};

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: JourneyStatus,
    public readonly to: JourneyStatus,
  ) {
    super(`Illegal journey transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function canTransition(from: JourneyStatus, to: JourneyStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(from: JourneyStatus, to: JourneyStatus): JourneyStatus {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
  return to;
}

export function nextStatuses(from: JourneyStatus): readonly JourneyStatus[] {
  return TRANSITIONS[from];
}
