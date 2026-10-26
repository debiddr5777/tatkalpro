/**
 * TatkalPro shared contracts.
 *
 * Single source of truth for every type that crosses a boundary:
 * REST payloads, WebSocket events, worker jobs, and DB row shapes.
 * Both the API and the frontend import from here — never re-declare.
 */
import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const Quota = z.enum(["TATKAL", "PREMIUM_TATKAL", "GENERAL"]);
export type Quota = z.infer<typeof Quota>;

export const CoachClass = z.enum(["SL", "2A", "3A", "3E", "1A", "CC", "EC", "2S"]);
export type CoachClass = z.infer<typeof CoachClass>;

export const Gender = z.enum(["Male", "Female", "Transgender"]);
export type Gender = z.infer<typeof Gender>;

export const BerthPreference = z.enum([
  "Lower",
  "Middle",
  "Upper",
  "Side Lower",
  "Side Upper",
  "Window Side",
  "No Preference",
]);
export type BerthPreference = z.infer<typeof BerthPreference>;

export const FoodChoice = z.enum(["Veg", "Non Veg", "No Food"]);
export type FoodChoice = z.infer<typeof FoodChoice>;

// ── Journey lifecycle ────────────────────────────────────────────────────────

export const JourneyStatus = z.enum([
  "DRAFT",
  "ARMED",
  "RUNNING",
  "CAPTCHA_SOLVE",
  "BOOKING_FORM_SUBMIT",
  "PAYMENT_PENDING",
  "BOOKED",
  "WAITLIST",
  "FAILED",
]);
export type JourneyStatus = z.infer<typeof JourneyStatus>;

// ── Entities ─────────────────────────────────────────────────────────────────

export const Passenger = z.object({
  name: z.string().min(1).max(15, "IRCTC limits names to 15 characters"),
  age: z.number().int().min(1).max(125),
  gender: Gender,
  berthPreference: BerthPreference.default("No Preference"),
  foodChoice: FoodChoice.default("No Food"),
  seniorCitizen: z.boolean().default(false),
  isChild: z.boolean().default(false),
});
export type Passenger = z.infer<typeof Passenger>;

/** Tatkal window open time per class (local IRCTC time). Configurable, not hardcoded. */
export const TATKAL_OPEN_TIMES: Record<Exclude<CoachClass, "1A">, "10:00" | "11:00"> = {
  "2A": "10:00",
  "3A": "10:00",
  "3E": "10:00",
  CC: "10:00",
  EC: "10:00",
  SL: "11:00",
  "2S": "11:00",
};

export const Journey = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  irctcAccountId: z.string().uuid(),
  sourceStationCode: z.string().length(2, 5),
  destinationStationCode: z.string().length(2, 5),
  boardingStationCode: z.string().length(2, 5).nullable(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quota: Quota,
  trainNo: z.string().regex(/^\d{4,5}$/),
  coachClass: CoachClass,
  passengers: z.array(Passenger).max(4, "IRCTC Tatkal allows at most 4 passengers per PNR"),
  bookOnlyIfConfirmed: z.boolean().default(true),
  autoUpgradation: z.boolean().default(true),
  targetOpenAt: z.string().datetime().nullable(),
  status: JourneyStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Journey = z.infer<typeof Journey>;

// ── WebSocket event envelope ─────────────────────────────────────────────────

export const WsEventName = z.enum([
  "journey:updated",
  "journey:status",
  "attempt:progress",
  "captcha:needs_human",
  "payment:pending",
  "payment:done",
  "session:expired",
  "booking:confirmed",
  "booking:failed",
]);
export type WsEventName = z.infer<typeof WsEventName>;

export const WsEvent = z.object({
  name: WsEventName,
  journeyId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  /** Correlation ID — traces the event back through OTel and pino logs. */
  correlationId: z.string(),
  payload: z.record(z.string(), z.unknown()),
});
export type WsEvent = z.infer<typeof WsEvent>;
