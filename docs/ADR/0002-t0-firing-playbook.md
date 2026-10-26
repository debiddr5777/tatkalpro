# ADR-0002 — The T-0 firing playbook (queue placement strategy)

**Status:** Accepted · **Date:** 2026-10-26

## Context

IRCTC does not expose a client-side queue. Queue position is determined by
when the booking request **arrives at the IRCTC server**. The levers are
therefore: eliminate every millisecond between T-0 and request arrival.

## Decision — the T-0 timeline

| Time | Action |
|---|---|
| T-30 min | Session login (captcha solved via OCR), JWT held, heartbeat every 4 min |
| T-15 min | Availability snapshot pre-fetched; fare envelope cached |
| T-5 min | Booking payload pre-computed, Zod-validated, serialized once |
| T-2 min | TLS + keep-alive connection pool warmed with synthetic HEAD requests |
| T-60 s | Re-verify session; re-solve login captcha if stale |
| T-0 − skew − jitter(20–80 ms) | Fire: pre-serialized payload + freshly-solved captcha |
| T-0 + 2 s | Review captcha submitted; retry ≤ 3 in < 2 s on failure |
| T-0 + 5 s | Payment stage surfaces in the UI — a human confirms, always |

## Rules

1. **Pre-authenticate** — login is the slowest step; never do it at T-0.
2. **Pre-warm TLS** — undici persistent agent, HTTP/2, keep-alive, session reuse. The first request at T-0 must not pay a TCP/TLS handshake.
3. **Pre-compute** — only the captcha token is unknown before T-0.
4. **Clock discipline** — measure IRCTC server skew from `Date` headers; NTP-sync the host; fire at `T-0 − skew − jitter`.
5. **Race two paths** — HTTP driver is primary; Playwright tab armed as fallback; single-flight lock dedupes the winner.
6. **Parallel accounts, not parallel requests** — one session per IRCTC account; never duplicate requests within a session.
7. **Measure everything** — `started_at`, `fired_at`, `response_at`, per-stage timings, Grafana-visible.

## What we will NOT do

- No request flooding, no parallel duplicate bookings, no bypassing IRCTC's
  rate limits, no auto-payment, no credential sharing.
