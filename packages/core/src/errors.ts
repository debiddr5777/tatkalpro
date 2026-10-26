/**
 * TatkalPro error taxonomy.
 *
 * IRCTC's error strings are mapped to typed codes so the orchestrator can
 * decide retry policy per error instead of string-matching at call sites.
 */

export type ErrorCode =
  | "IRCTC_CAPTCHA_INVALID"
  | "IRCTC_BOOKING_NOT_OPEN"
  | "IRCTC_NO_SEATS"
  | "IRCTC_SORRY_TRY_AGAIN"
  | "IRCTC_SESSION_EXPIRED"
  | "IRCTC_TRANSACTION_UNABLE_TO_PROCESS"
  | "IRCTC_RATE_LIMITED"
  | "IRCTC_UNKNOWN"
  | "NETWORK_ERROR"
  | "APP_ILLEGAL_STATE";

/** Errors that are safe to retry with backoff. */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  "IRCTC_CAPTCHA_INVALID",
  "IRCTC_SORRY_TRY_AGAIN",
  "IRCTC_TRANSACTION_UNABLE_TO_PROCESS",
  "IRCTC_RATE_LIMITED",
  "NETWORK_ERROR",
]);

/** Fatal — a retry can never succeed. */
const FATAL: ReadonlySet<ErrorCode> = new Set(["IRCTC_NO_SEATS", "APP_ILLEGAL_STATE"]);

export class BookingError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BookingError";
  }

  get isRetryable(): boolean {
    return RETRYABLE.has(this.code);
  }

  get isFatal(): boolean {
    return FATAL.has(this.code);
  }
}

/** Map an IRCTC response body / page text to a typed error code. */
export function classifyIrctcError(text: string): BookingError {
  const map: ReadonlyArray<[RegExp, ErrorCode]> = [
    [/Invalid Captcha/i, "IRCTC_CAPTCHA_INVALID"],
    [/Booking not yet started/i, "IRCTC_BOOKING_NOT_OPEN"],
    [/No seats available/i, "IRCTC_NO_SEATS"],
    [/Sorry!!! Please Try again/i, "IRCTC_SORRY_TRY_AGAIN"],
    [/Unable to process current transaction/i, "IRCTC_TRANSACTION_UNABLE_TO_PROCESS"],
    [/session.*expired/i, "IRCTC_SESSION_EXPIRED"],
  ];
  for (const [pattern, code] of map) {
    if (pattern.test(text)) {
      return new BookingError(code, text);
    }
  }
  return new BookingError("IRCTC_UNKNOWN", text);
}
