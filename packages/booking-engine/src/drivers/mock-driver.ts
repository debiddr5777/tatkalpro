/**
 * MockDriver — deterministic offline adapter.
 *
 * Replays recorded IRCTC responses so the entire pipeline (orchestrator,
 * state machine, queues, metrics) is testable end-to-end without touching
 * irctc.co.in. CI runs exclusively against this driver.
 */
import type {
  Availability,
  AvailabilityQuery,
  BookingDriver,
  BookingForm,
  BookingResult,
  IrctcCredentials,
  PaymentIntent,
  PnrStatus,
  Session,
} from "../driver.js";
import type { Journey } from "@tatkalpro/contracts";
import { BookingError } from "@tatkalpro/core";

export class MockDriver implements BookingDriver {
  private sessionId = 0;

  async login(credentials: IrctcCredentials): Promise<Session> {
    this.sessionId += 1;
    return {
      id: `mock-session-${this.sessionId}`,
      jwt: "mock.jwt.token",
      jwtExpiresAtEpochMs: Date.now() + 25 * 60 * 1000,
      serverClockSkewMs: 0,
    };
  }

  async heartbeat(session: Session): Promise<Session> {
    return session;
  }

  async searchAvailability(_session: Session, query: AvailabilityQuery): Promise<Availability> {
    return {
      trainNo: query.trainNo,
      coachClass: query.coachClass,
      travelDate: query.travelDate,
      availableSeats: 42,
      status: "AVAILABLE",
      fare: 1234,
    };
  }

  async prepareBookingForm(_session: Session, journey: Journey): Promise<BookingForm> {
    return {
      journey,
      passengers: [],
      bookOnlyIfConfirmed: journey.bookOnlyIfConfirmed,
      autoUpgradation: journey.autoUpgradation,
      serializedPayload: JSON.stringify({ trainNo: journey.trainNo, mock: true }),
    };
  }

  async submitBooking(
    _session: Session,
    _form: BookingForm,
    captchaText: string,
  ): Promise<BookingResult> {
    if (captchaText.length === 0) {
      throw new BookingError("IRCTC_CAPTCHA_INVALID", "empty captcha");
    }
    return { pnr: "8421000000", paymentRedirectUrl: "https://mock.paytm/upi", rawStatusText: "OK" };
  }

  async fetchPayment(_session: Session, _result: BookingResult): Promise<PaymentIntent> {
    return { gateway: "UPI", upiId: "mock@upi", qrPayload: "upi://mock", requiresHumanConfirmation: true };
  }

  async checkPnr(_session: Session, pnr: string): Promise<PnrStatus> {
    return { pnr, status: "CNF", passengersBooked: 2, waitlistPosition: null };
  }
}
