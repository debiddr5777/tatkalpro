/**
 * BookingDriver — the port (hexagonal boundary) every IRCTC adapter implements.
 *
 * The orchestrator only ever talks to this interface. Adapters:
 *   HttpDriver      — the fast path (mirrors the IRCTC Angular frontend's request sequence)
 *   PlaywrightDriver — fallback + HAR recording
 *   MockDriver      — deterministic HAR replay for offline CI
 *
 * Implementations live in src/drivers/. Keep this file free of any concrete
 * HTTP or browser code.
 */
import type {
  CoachClass,
  Journey,
  Passenger,
  Quota,
} from "@tatkalpro/contracts";

export interface IrctcCredentials {
  username: string;
  password: string;
}

export interface Session {
  id: string;
  jwt: string;
  jwtExpiresAtEpochMs: number;
  /** Measured server clock skew (IRCTC Date header minus local clock), in ms. */
  serverClockSkewMs: number;
}

export interface AvailabilityQuery {
  trainNo: string;
  coachClass: CoachClass;
  quota: Quota;
  travelDate: string;
  sourceStationCode: string;
  destinationStationCode: string;
}

export interface Availability {
  trainNo: string;
  coachClass: CoachClass;
  travelDate: string;
  availableSeats: number;
  status: "AVAILABLE" | "RAC" | "WAITLIST" | "NOT_OPEN";
  fare: number;
}

/** Pre-computed booking payload — every field except the captcha is known before T-0. */
export interface BookingForm {
  journey: Journey;
  passengers: Passenger[];
  bookOnlyIfConfirmed: boolean;
  autoUpgradation: boolean;
  /** Serialized once, validated with Zod, ready to be sent with only the captcha injected. */
  serializedPayload: string;
}

export interface BookingResult {
  pnr: string | null;
  paymentRedirectUrl: string | null;
  rawStatusText: string;
}

export interface PaymentIntent {
  gateway: "UPI" | "BANK";
  upiId: string | null;
  qrPayload: string | null;
  /** The app NEVER auto-pays — the human confirms in the UI. */
  requiresHumanConfirmation: true;
}

export interface PnrStatus {
  pnr: string;
  status: string;
  passengersBooked: number;
  waitlistPosition: number | null;
}

export interface BookingDriver {
  login(credentials: IrctcCredentials): Promise<Session>;
  heartbeat(session: Session): Promise<Session>;
  searchAvailability(session: Session, query: AvailabilityQuery): Promise<Availability>;
  /** Steps 1–2 of the flow: open the booking form and pre-compute the payload. */
  prepareBookingForm(session: Session, journey: Journey): Promise<BookingForm>;
  /** Steps 3–4: submit the payload with the freshly-solved captcha. */
  submitBooking(session: Session, form: BookingForm, captchaText: string): Promise<BookingResult>;
  /** Stops at the payment redirect — never auto-pays. */
  fetchPayment(session: Session, result: BookingResult): Promise<PaymentIntent>;
  checkPnr(session: Session, pnr: string): Promise<PnrStatus>;
}
