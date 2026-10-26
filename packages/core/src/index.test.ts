import { describe, expect, it } from "vitest";
import { FakeClock } from "./clock.js";
import { BookingError, classifyIrctcError } from "./errors.js";
import { canTransition, IllegalTransitionError, transition } from "./state-machine.js";

describe("state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("DRAFT", "ARMED")).toBe(true);
    expect(canTransition("ARMED", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "CAPTCHA_SOLVE")).toBe(true);
    expect(canTransition("CAPTCHA_SOLVE", "BOOKING_FORM_SUBMIT")).toBe(true);
    expect(canTransition("BOOKING_FORM_SUBMIT", "PAYMENT_PENDING")).toBe(true);
    expect(canTransition("PAYMENT_PENDING", "BOOKED")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransition("DRAFT", "BOOKED")).toBe(false);
    expect(() => transition("DRAFT", "BOOKED")).toThrow(IllegalTransitionError);
    expect(() => transition("BOOKED", "DRAFT")).toThrow(IllegalTransitionError);
  });
});

describe("clock", () => {
  it("advances deterministically", () => {
    const clock = new FakeClock(1_000_000);
    expect(clock.nowMs()).toBe(1_000_000);
    clock.advance(500);
    expect(clock.nowMs()).toBe(1_000_500);
    expect(clock.untilMs(1_000_400)).toBe(-100);
  });
});

describe("error taxonomy", () => {
  it("maps IRCTC strings to typed codes", () => {
    expect(classifyIrctcError("No seats available").code).toBe("IRCTC_NO_SEATS");
    expect(classifyIrctcError("No seats available").isFatal).toBe(true);
    expect(classifyIrctcError("Sorry!!! Please Try again!!").isRetryable).toBe(true);
    expect(classifyIrctcError("something else").code).toBe("IRCTC_UNKNOWN");
  });

  it("BookingError carries retryability", () => {
    const err = new BookingError("NETWORK_ERROR", "ECONNRESET");
    expect(err.isRetryable).toBe(true);
    expect(err.isFatal).toBe(false);
  });
});
