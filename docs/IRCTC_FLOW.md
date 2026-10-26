# IRCTC booking flow — reverse-engineered reference

> Keep this document updated whenever the HAR is re-captured. The HttpDriver
> must mirror the real Angular frontend's request sequence **exactly** —
> headers, cookies, JWT handling, and payload shapes.

## Captured from

- Reference repo: `shivamguys/irctc-cypress-automation` (Cypress/DOM flow)
- HAR captures: `pnpm record:irctc` → `har/irctc-<date>.har` (gitignored)

## Base

- Site: `https://www.irctc.co.in/nget/train-search` (Angular "NextGen e-Ticketing")
- Publicly documented mobile endpoints (from open-source clients):
  - `/authprovider/webtoken` — login
  - `/eticketing/protected/mapps1/loginCaptcha` — captcha image
  - `/eticketing/protected/mapps1/altabordiginalistrains` — train search
  - `/eticketing/protected/mapps1/avlFarenquiry` — availability/fare
  - `/eticketing/protected/mapps1/bookticket` — booking
  - `/eticketing/protected/mapps1/pnrenq` — PNR status

## Flow (web frontend)

1. **Login** — form POST with username/password/captcha → JWT.
2. **Search** — from/to/date/quota → train list (`.bull-back` rows in the DOM).
3. **Availability** — click class → availability + fare.
4. **Book Now** — passenger form (Angular reactive forms: `passengerAge`,
   `passengerGender`, `passengerBerthChoice`, `passengerFoodChoice`).
5. **Flags** — "Book only if confirm berths are allotted", "Consider for Auto Upgradation".
6. **Review captcha** — second-stage captcha on the review page.
7. **Payment** — UPI via Paytm/BHIM gateway (`/theia/processTransaction`).

## IRCTC error taxonomy (map to `ErrorCode` in @tatkalpro/core)

| Site string | Code | Retryable |
|---|---|---|
| "Invalid Captcha" | IRCTC_CAPTCHA_INVALID | yes |
| "Booking not yet started for the selected quota and class" | IRCTC_BOOKING_NOT_OPEN | yes |
| "No seats available" | IRCTC_NO_SEATS | no (fatal) |
| "Sorry!!! Please Try again!!" | IRCTC_SORRY_TRY_AGAIN | yes |
| "Unable to process current transaction" | IRCTC_TRANSACTION_UNABLE_TO_PROCESS | yes |
| "Your Last Transaction" dialog | (dismiss, not an error) | — |

## Tatkal windows

- AC classes (2A, 3A, 3E, CC, EC): **10:00 IST** — 1 day before journey
- SL, 2S: **11:00 IST** — 1 day before journey
- Max 4 passengers per PNR (Tatkal)
