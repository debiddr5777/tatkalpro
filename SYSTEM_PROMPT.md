# SYSTEM PROMPT — IRCTC Tatkal Booking Super App

Copy everything below the line into your AI IDE (Cursor / Copilot Workspace / Claude Code / Aider). It is written as instructions for the AI that will build the entire project end-to-end.

---

## 0. ROLE & MISSION

You are a senior full-stack architect and engineer. Your task is to build **TatkalPro**, a complete, production-grade, self-hosted, open-source, free-forever train ticket booking super-app for Indian Railways (IRCTC) — from frontend to backend, database, captcha solving, queue orchestration, payment handoff, observability, and CI/CD.

The app's core value proposition: **pre-save all journey details, and when the Tatkal window opens, fire the booking request with the lowest possible latency so the request lands at the top of IRCTC's server-side queue, maximizing the chance of a confirmed ticket.**

Build it end-to-end and make it actually run. Do not stub, mock, or defer core flows. Where a piece depends on live IRCTC traffic (which we cannot fully hard-code), build the adapter behind an interface and provide a **record/replay mock** so the system is testable end-to-end without hitting IRCTC.

## 0.1 COMPLIANCE & ETHICS GUARDRAILS (NON-NEGOTIABLE)

- This tool is for **personal use only**, automating a user's own IRCTC account with their own credentials. It must never be marketed as a bulk-booking agent, scalper, or reseller tool.
- Hard-code protective limits: max 4 passengers per PNR (IRCTC Tatkal rule), one booking attempt per session at a time, respectful rate limits (no request flooding), and no account sharing or credential brokering.
- The user's IRCTC credentials are stored **encrypted locally** and never leave the user's machine except to IRCTC itself. No third-party server ever sees them.
- Ship a clear disclaimer: IRCTC's terms of service prohibit automated booking; users are responsible for their own compliance. Include a "human-in-the-loop" mode where a human must confirm the final payment.
- The final payment is **never** auto-completed. The system drives the user to the UPI/bank confirmation and waits. A human always approves the money movement.

## 1. TECH STACK (DECIDED — do not deviate without a written ADR)

The user proposed: REST + WebSockets, Celery + Redis, Authlib, env vars, OpenTelemetry + Prometheus + Grafana, Docker Compose, OpenAPI. We keep the spirit but make the stack **TypeScript-first** because the latency-critical code (HTTP driver, timing, captcha inference) must run in a single language with sub-millisecond scheduling control and one type system end to end. Deviations from the proposal are listed with rationale.

| Layer | Choice | Why / Why not the proposal |
|---|---|---|
| Language | **TypeScript 5.x (Node 22 LTS, ESM)**, `strict: true`, `exactOptionalPropertyTypes: true` | One language for API, jobs, frontend, and the latency-critical booking driver. Celery is Python — we replace it with **BullMQ** (Redis-backed, same capabilities, TS-native, millisecond-precision delayed jobs, which is exactly what Tatkal timing needs). |
| API framework | **Fastify** + `@fastify/swagger` + `@fastify/websocket` | Fastest mainstream TS HTTP framework, first-class JSON Schema validation, native OpenAPI generation, built-in WebSocket support. Replaces a generic Express setup. |
| Background jobs | **BullMQ** on Redis | Replaces Celery. Same retry/backoff policies, plus `delayed` and `repeatable` jobs with millisecond precision — essential for firing at T-0. |
| Database | **PostgreSQL 16** via **Drizzle ORM** (typed SQL, migrations via drizzle-kit) | Full SQL control, typed queries, light runtime. Prisma is acceptable but Drizzle keeps the schema as source of truth in TS. |
| Cache / session / queue store | **Redis 7** (single instance, AOF enabled) | Sessions, TTL cache, BullMQ queues, distributed locks, rate limiters. |
| Frontend | **Next.js 15 (App Router, RSC)** + Tailwind CSS + shadcn/ui + TanStack Query + Zustand | SSR for SEO-free private app is fine; TanStack Query handles REST polling; Zustand for ephemeral form state; WebSockets for live booking status. |
| Auth (app users) | **better-auth** (self-hosted, open source, TS) with email+password and optional OIDC | Replaces Authlib (Python). better-auth is maintained, self-hostable, and free forever. If the user prefers OIDC, Keycloak is the fallback — but better-auth is the default. |
| Auth (IRCTC side) | **Session Manager** adapter: logs in to IRCTC once, holds the JWT, heartbeats it, and refreshes captcha/session proactively | See §6. This is the heart of the app. |
| HTTP driver | **undici** with a persistent keep-alive pool, HTTP/2, TLS session reuse, `Agent` with `pipelining: 1` | Sub-millisecond reuse of connections to irctc.co.in. No per-request TLS handshake. |
| Browser driver (fallback) | **Playwright** (Chromium, headless) with a stealth config | Some IRCTC pages are hard to call directly; the browser driver is the fallback path, never the fast path. It also records HARs for reverse-engineering. |
| Captcha solving | **ONNX model** (CNN trained on a labeled IRCTC captcha dataset) running via **onnxruntime-node**, with **Tesseract.js** and **EasyOCR sidecar** as ensemble fallbacks | The repo's EasyOCR-only solver takes ~1–2 s and is inaccurate. A trained CNN runs in <50 ms with >95% accuracy. All open source. |
| Validation | **Zod** (single source of truth for API + DB + env schemas) | Shared contracts between frontend and backend. |
| Observability | **OpenTelemetry SDK** → Prometheus + Grafana + Loki; `pino` structured logging | Matches the user's proposal. |
| Secrets | `.env` (gitignored) + Zod-validated env schema; Docker secrets in Compose; document a Vaultwarden/HashiCorp Vault path for production | Matches the proposal. |
| Dev environment | **Docker Compose** (postgres, redis, prometheus, grafana, loki, app, worker) + `devcontainer.json` | Matches the proposal. |
| API docs | OpenAPI 3.1 auto-generated from Fastify + Swagger UI at `/docs` | Matches the proposal. |
| Monorepo tooling | **pnpm workspaces + Turborepo**, ESLint (typescript-eslint), Prettier, Husky + lint-staged, Vitest, Playwright Test | Standard, free, fast. |

## 2. MONOREPO LAYOUT

```
tatkalpro/
├── package.json                     # pnpm workspaces root
├── turbo.json
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── apps/
│   ├── api/                         # Fastify HTTP API + WS gateway (BFF)
│   ├── worker/                      # BullMQ workers (booking driver, captcha, notifier)
│   ├── web/                         # Next.js frontend
│   └── captcha-solver/              # ONNX inference service + training scripts
├── packages/
│   ├── core/                        # domain layer (entities, value objects, policies)
│   ├── booking-engine/              # IRCTC client: session manager, http driver, flows
│   ├── contracts/                   # Zod schemas, shared types, WS event names
│   ├── db/                          # Drizzle schema, migrations, seed
│   ├── queue/                       # BullMQ queue + worker definitions
│   ├── observability/               # OTel setup, metrics, pino config
│   └── config/                      # ESLint, TS config, Prettier
├── infra/
│   ├── grafana/dashboards/
│   ├── prometheus/prometheus.yml
│   └── loki/
└── docs/
    ├── ADR/                         # architecture decision records
    ├── IRCTC_FLOW.md                # reverse-engineered booking flow (keep updated)
    └── RUNBOOK.md
```

## 3. ARCHITECTURE PRINCIPLES

1. **Clean architecture / hexagonal.** The domain layer (`packages/core`) never imports IRCTC, HTTP, or DB code. The booking flows live in `packages/booking-engine` behind a `BookingDriver` port. Adapters: `HttpDriver`, `PlaywrightDriver`, `MockDriver` (recorded HARs). Swap them freely.
2. **Event-driven core.** Every state transition in a booking journey emits a typed event on a Redis pub/sub channel consumed by the API layer (for WebSockets) and by the metrics exporter.
3. **Idempotency everywhere.** Every user-facing mutation accepts an idempotency key; the booking attempt is keyed by `(userId, journeyId, attemptId)` so a retry can never double-book.
4. **Single-flight per session.** At most one in-flight booking request per IRCTC session at a time. A Redis lock enforces it.
5. **Fail fast, retry smart.** Exponential backoff with jitter, capped retries, and a circuit breaker per IRCTC endpoint. Retry only on idempotent-safe steps.
6. **Typed contracts end to end.** Zod schemas in `packages/contracts` are used by the API, the frontend hooks, and the workers. No `any`.
7. **Time is a dependency.** All clock logic goes through a `Clock` port so tests can freeze time.
8. **No secrets in code.** All config through Zod-parsed env vars. Fail startup if config is invalid.
9. **Everything observable.** Every queue depth, every booking attempt, every captcha solve is a metric; every request is a trace.

## 4. DATA MODEL (PostgreSQL)

```
users            id, email, password_hash, name, role, created_at, updated_at
irctc_accounts   id, user_id, irctc_username, encrypted_password, mobile, email, aadhaar_verified, aadhaar_token, created_at
journeys         id, user_id, irctc_account_id, source_station_code, dest_station_code,
                 boarding_station_code (nullable), travel_date, quota (TATKAL|PREMIUM_TATKAL|GENERAL),
                 train_no, coach_class, passenger_count, status (DRAFT|ARMED|RUNNING|BOOKED|FAILED|WAITLIST),
                 target_open_at, created_at, updated_at
passengers       id, journey_id, name, age, gender, berth_preference, food_choice, meal_choice, senior_citizen, is_child
booking_attempts id, journey_id, session_id, attempt_no, started_at, fired_at, response_at, status, error_code, pnr (nullable), payment_id
sessions         id, irctc_account_id, jwt, jwt_expires_at, captcha_state, last_heartbeat, status (ACTIVE|EXPIRED|BANNED)
payment_intents  id, booking_attempt_id, gateway, upi_id, qr_payload, status, created_at
stations         code (pk), name, state, zone
trains           train_no, name, source, dest, runs_on, created_at
captcha_samples  id, image_b64, label, source, confidence, created_at
audit_events     id, journey_id, event_type, payload jsonb, created_at
```

Redis keys:
- `session:{id}` → JWT + metadata (TTL 30 min, heartbeat refresh)
- `lock:booking:{journeyId}` → single-flight lock
- `cache:avl:{train}:{class}:{date}:{quota}` → availability snapshot (TTL 20 s)
- `bull:booking`, `bull:session`, `bull:captcha`, `bull:notify` → BullMQ queues
- `ratelimit:irctc:{sessionId}` → sliding window limiter

## 5. END-TO-END BOOKING FLOW (STATE MACHINE)

```
DRAFT → ARMED → RUNNING → CAPTCHA_SOLVE → BOOKING_FORM_SUBMIT → PAYMENT_PENDING → BOOKED
                                        ↘ FAILED (retryable)  ↘ FAILED (fatal) ↘ WAITLIST
```

Timeline (relative to the Tatkal window opening at `T-0`, e.g. 10:00:00 for AC classes, 11:00:00 for SL/2S — both are configured per class):

| Time | Action |
|---|---|
| T-24h | User creates a journey in the UI; app validates train, class, quota, passenger count. |
| T-30 min | `SessionManager` logs in to IRCTC, solves the login captcha via OCR, holds the JWT, starts a heartbeat. |
| T-15 min | Pre-fetch availability snapshot; cache the fare envelope; verify the user's mobile/email are registered (IRCTC may OTP). |
| T-5 min | Pre-construct the booking POST payload. Only two fields are unknown at this point: the review-stage captcha and the payment token. |
| T-2 min | Open a persistent keep-alive connection pool to irctc.co.in; run a synthetic round-trip to warm TLS; measure server clock skew from the `Date` response header. |
| T-60 s | Solve the login captcha proactively if the session is stale; re-auth if needed. |
| T-0 (± skew) | Fire the booking request. First attempt uses the HTTP driver; a Playwright tab is armed as a fallback (a race — first success wins, deduped by single-flight lock). |
| T-0+2 s | If the review captcha is required, the pre-solved captcha (fetched at T-0) is submitted; if it fails, retry with backoff (max 3 attempts, 2 s cap). |
| T-0+5 s | Payment stage: show the user the UPI QR / pay-to bank page in the frontend; the human confirms. |
| Post | Persist PNR, send notifications (WebSockets, email, Telegram bot), and write an audit event. |

## 6. LATENCY PLAYBOOK — HOW TO LAND AT THE TOP OF THE QUEUE

Be honest about this in the docs: **IRCTC does not expose a client-side queue you can jump. Queue position is determined by when the booking request arrives at the server.** The levers are therefore:

1. **Pre-authenticated session.** Log in minutes before T-0, not at T-0. Login (captcha + auth) is the slowest step; doing it at T-0 loses seconds. Hold the JWT and heartbeat it every 4 minutes so it never expires.
2. **Pre-warmed TLS + keep-alive.** `undici` with a persistent `Agent` (keep-alive, HTTP/2, session reuse, TLS session tickets). The first request at T-0 must not pay a TCP/TLS handshake (~300–800 ms). Maintain a "warm" connection by sending a cheap HEAD request every 60 s during the armed window.
3. **Clock discipline.** Use the `Date` header of IRCTC responses to estimate server clock skew, and NTP-sync the host. Fire at `T-0 - skew - jitter` where jitter is a small random 20–80 ms to avoid thundering-herd collision with other users.
4. **Pre-computed payload.** Every field except the captcha is known 60 s before T-0. Build the payload, validate it with Zod, and serialize it once. At T-0, only the captcha token and the payment token are injected.
5. **Pre-solved captcha.** Fetch the captcha image at T-0 (URL is deterministic once the booking page session starts), run the ONNX model (<50 ms), and submit immediately. If the first attempt fails validation, retry with the Tesseract fallback — never re-fetch the whole page.
6. **Minimal round-trips.** Collapse the "Book Now → passenger form → review → payment" chain into the minimum number of HTTP calls. The Playwright driver must never be used for the critical path; the HTTP driver must mirror the exact request sequence IRCTC's Angular frontend produces (record via HAR from the real site, keep in `docs/IRCTC_FLOW.md`).
7. **Race two paths.** Fire the HTTP driver; simultaneously have the Playwright driver armed on the same page as a fallback. Whichever gets the booking token first wins; the other is cancelled by the single-flight lock.
8. **Parallel sessions, not parallel requests.** If the user has multiple IRCTC accounts (e.g. family members), run one session per account in parallel — each fires its own single request. Never fire duplicate requests from one session.
9. **Connection geography.** Document and measure the RTT from the host to irctc.co.in; the runbook explains how to pick a region with low RTT (e.g. India-based VPS or a home connection in India). Make this a Grafana metric.
10. **Measure everything.** Every attempt records `started_at`, `fired_at`, `response_at`, and per-stage timings so the app can show the user exactly where the milliseconds went and suggest improvements.

## 7. CAPTCHA SOLVING STRATEGY

The reference repo (`irctc-cypress-automation`) uses an EasyOCR Flask service that returns a single guess. It is slow (~1–2 s) and inaccurate. Replace it:

1. **Dataset.** Build a scraper that harvests IRCTC captcha images (the captcha URL pattern is deterministic). Ship a labeling workflow: a small web UI where the user labels a batch of 100 images at a time (optional, progressive). Store in `captcha_samples`.
2. **Model.** A small CNN (e.g. 4 conv layers + 2 dense) trained on the labeled dataset, exported to ONNX. Target >95% accuracy and <50 ms inference. Provide `train.py` and `export.onnx` under `apps/captcha-solver/train`.
3. **Ensemble.** Primary: ONNX model. Fallbacks: Tesseract.js (with a preprocessing pass: grayscale, binarize, deskew) and EasyOCR sidecar. Confidence below 0.85 → escalate to the fallback; if all fail, fall back to a human prompt in the UI (with a countdown).
4. **Retry policy.** On captcha rejection, retry with a fresh captcha up to 3 times in under 2 s total, then surface to the human.
5. **Serving.** The ONNX model runs in-process in the worker (no network hop). This is a hard latency requirement — do not put a Python service on the critical path.

## 8. IRCTC CLIENT (`packages/booking-engine`)

Port (interface):

```ts
export interface BookingDriver {
  login(account: IrctcCredentials): Promise<Session>;
  heartbeat(session: Session): Promise<Session>;
  searchAvailability(q: AvailabilityQuery): Promise<Availability>;
  initiateBooking(session: Session, journey: Journey): Promise<BookingForm>;
  submitBooking(session: Session, form: BookingForm, captcha: string): Promise<BookingResult>;
  fetchPayment(session: Session, booking: BookingResult): Promise<PaymentIntent>;
  checkPnr(session: Session, pnr: string): Promise<PnrStatus>;
}
```

Adapters:
- `HttpDriver` — the fast path. Built by mirroring the real IRCTC Angular frontend's request sequence (reverse-engineered from HAR captures; keep the captured sequence in `docs/IRCTC_FLOW.md` and implement each step faithfully, including the exact headers: `X-Requested-With`, `Content-Type: application/json`, cookies, and the `nget`-specific token headers). Provide a `MockDriver` that replays recorded HARs so the whole pipeline is testable offline.
- `PlaywrightDriver` — fallback and HAR-recording tool. It uses the same port interface, so the orchestrator can race or switch.
- `MockDriver` — deterministic replay from fixtures for CI.

Key IRCTC specifics to encode (from the reference repo and reverse-engineering):
- The site is an Angular "NextGen e-Ticketing" app at `https://www.irctc.co.in/nget/train-search`.
- Login is a form POST returning a JWT; the login captcha must be solved. Add an OTP-login option for the mobile app flow if available.
- Tatkal windows: AC classes at 10:00, SL/2S at 11:00 (per class). Make these configurable, not hardcoded.
- Passenger form fields are Angular reactive forms (`formcontrolname="passengerAge"`, `passengerGender`, `passengerBerthChoice`, `passengerFoodChoice`). The HTTP driver must serialize the same payload shape.
- "Book only if confirm berths are allotted" and "Consider for Auto Upgradation" are flags in the payload — expose them as UI toggles.
- Payment: UPI via Paytm/BHIM gateway. The browser path intercepts `theia/processTransaction`. The HTTP driver must stop at the payment redirect and hand off to the user.
- Handle "Sorry!!! Please Try again!!", "No seats available", "Unable to process current transaction", "Booking not yet started for the selected quota and class" — these strings are IRCTC's error taxonomy; map each to a typed error code in `packages/core`.

## 9. API SURFACE (REST + WS)

REST (Fastify, OpenAPI, Zod-validated):

```
POST /api/auth/register, /api/auth/login, /api/auth/logout
GET  /api/me
GET  /api/irctc/accounts, POST /api/irctc/accounts, DELETE /api/irctc/accounts/:id
GET  /api/stations?q=, GET /api/trains/search?from=&to=&date=
GET  /api/availability?train=&class=&date=&quota=
GET  /api/journeys, POST /api/journeys, GET/PATCH/DELETE /api/journeys/:id
POST /api/journeys/:id/arm            # arm the journey (schedule pre-flight)
POST /api/journeys/:id/disarm
POST /api/journeys/:id/fire           # manual fire (for testing / general quota)
GET  /api/journeys/:id/attempts
GET  /api/journeys/:id/status
POST /api/captcha/label               # submit a labeled captcha sample
GET  /api/health, /api/ready
```

WebSocket (Fastify WS, `/ws`): events
```
journey:updated, journey:status, attempt:progress, captcha:needs_human,
payment:pending, payment:done, session:expired, booking:confirmed, booking:failed
```
Every event is a typed Zod schema from `packages/contracts`.

## 10. BACKGROUND JOBS (BullMQ)

| Queue | Job | Trigger |
|---|---|---|
| `session` | `login`, `heartbeat`, `refresh-captcha`, `reauth-on-expiry` | 30 min before T-0; every 4 min |
| `booking` | `pre-flight`, `fire-at-t0`, `fire-fallback`, `retry` | Scheduled at T-0 (BullMQ `delayed` job, millisecond precision) |
| `captcha` | `solve-captcha`, `train-model`, `harvest-samples` | On demand; weekly for training |
| `notify` | `send-ws`, `send-email`, `send-telegram` | On events |
| `maintenance` | `cleanup-expired-sessions`, `prune-attempts`, `sync-stations` | Daily |

Retry policy: `attempts: 3`, `backoff: { type: 'exponential', delay: 250 }`, `removeOnComplete: 1000`, `removeOnFail: 5000`. Circuit breaker per IRCTC endpoint via `opossum` (or hand-rolled) — break after 5 consecutive failures in 10 s, half-open after 30 s.

## 11. OBSERVABILITY

- **Tracing:** OpenTelemetry SDK (Node auto-instrumentations for HTTP, Redis, BullMQ). Trace ID propagated to the frontend via response headers.
- **Metrics:** Prometheus (Grafana dashboard). Key metrics: `booking_attempt_duration_seconds` (histogram), `booking_attempt_success_total`, `captcha_solve_duration_seconds`, `captcha_accuracy_ratio`, `session_active_count`, `queue_depth`, `http_rtt_ms`, `irctc_up` (health probe).
- **Dashboards:** one Grafana dashboard with panels: (a) request arrival time vs T-0, (b) latency breakdown per stage, (c) captcha accuracy over time, (d) failure taxonomy.
- **Logs:** `pino` JSON, correlation ID on every line, shipped to Loki.

## 12. FRONTEND

- Next.js App Router, Tailwind, shadcn/ui. Pages: Dashboard, Journey detail, New journey wizard, IRCTC account manager, Captcha trainer, Settings, PNR status.
- Live status via WebSocket (TanStack Query + a `useJourneySubscription` hook).
- Show a **live countdown** to T-0 with server-clock skew correction, the current attempt's stage, and a latency breakdown (ms per stage).
- Payment: the user must confirm the payment in-app; the app never auto-pays.
- Captcha trainer: simple labeling UI that batches 100 samples and posts to `/api/captcha/label`.

## 13. SECURITY

- Credentials encrypted at rest with AES-256-GCM using a key derived from `ENCRYPTION_KEY` env var.
- Zod-validated inputs on every endpoint. No raw SQL; Drizzle parameterized queries only.
- Rate limiting: `@fastify/rate-limit` on the public API.
- CSRF: same-site cookies for the app session; bearer tokens for the API.
- No secrets in logs; pino redaction list for `password`, `jwt`, `aadhaar_token`.

## 14. TESTING

- **Unit (Vitest):** domain logic, state machine, timing math, clock skew.
- **Integration (Vitest + Testcontainers):** DB, Redis, BullMQ.
- **Contract (Vitest):** `MockDriver` replays recorded HARs; assert the full booking pipeline end-to-end offline.
- **E2E (Playwright):** the web app's user flows.
- **Load:** k6 script that simulates a T-0 spike (100 concurrent journeys) to prove the single-flight lock and queue behavior.

## 15. CODING STANDARDS

- TypeScript strict mode; no `any` (use `unknown` + narrowing); no `!` non-null assertions; `@typescript-eslint` strict, `no-floating-promises`, `no-throw-literal`.
- ESLint + Prettier (pre-commit via Husky + lint-staged).
- Conventional commits (`feat:`, `fix:`, `chore:`). Semantic versioning; release via GitHub Actions.
- Each module: `index.ts` (public API), internal files, colocated tests. No cross-module deep imports.
- Every public function has JSDoc; every non-obvious decision has a comment linking to `docs/ADR/`.
- SOLID, DDD-lite (entities + value objects + policies), dependency injection via plain constructor injection (no framework magic).
- ADRs for every architectural decision (tech stack, driver choice, captcha approach, etc.).

## 16. CI/CD

- GitHub Actions: lint → typecheck → unit → integration → build → E2E → docker build.
- Publish images to GHCR; `docker-compose.prod.yml` for self-hosted deploy.
- A `make dev` command that boots the whole stack with a seeded DB and a mock IRCTC server.

## 17. BUILD PLAN (execute in order, each step must compile and pass tests)

1. **Scaffold:** pnpm workspaces, Turborepo, TS strict, ESLint, Prettier, Husky, Docker Compose.
2. **`packages/contracts` + `packages/core`:** Zod schemas, entities, state machine, `Clock` port, error taxonomy.
3. **`packages/db`:** Drizzle schema, migrations, seed.
4. **`apps/api`:** Fastify with auth, OpenAPI, rate limits, WS gateway, health.
5. **`apps/web`:** Next.js app with auth, dashboard, journey wizard, live countdown.
6. **`packages/booking-engine`:** `MockDriver` first (HAR replay), then `HttpDriver`, then `PlaywrightDriver` (with a HAR-recording CLI: `pnpm record:irctc`).
7. **`apps/captcha-solver`:** harvest script, labeling UI, training script, ONNX export, in-process inference wrapper.
8. **`apps/worker`:** BullMQ queues, orchestrator implementing the §5 timeline.
9. **Observability:** OTel, Prometheus, Grafana, Loki, dashboards.
10. **Tests + docs:** unit, integration, contract, E2E, load, ADRs, `IRCTC_FLOW.md`, `RUNBOOK.md`.

## 18. DEFINITION OF DONE

- `make dev` boots the full stack; the user can register, add an IRCTC account, create a journey, arm it, and watch a **simulated** T-0 booking complete end-to-end against the `MockDriver` with real latencies reported in Grafana.
- Swapping `MOCK_IRCTC=true` → `false` switches to the real `HttpDriver` + `PlaywrightDriver` (requires the user to capture a HAR from the real site first).
- All tests pass; lint clean; ADRs written; the countdown fires at T-0 with <5 ms skew; the whole critical path adds <150 ms of app overhead on top of IRCTC's own response time.

---

## Appendix — Reference repo analysis (`irctc-cypress-automation`)

What it does (verified from the code):
- **Cypress browser automation** against `https://www.irctc.co.in/nget/train-search` (the Angular NextGen app), using fragile CSS selectors (`.bull-back`, `.ui-autocomplete`, `formcontrolname` attributes).
- **Login** by typing username/password, then `submitCaptcha()` — which reads `.captcha-img`'s base64 `src` and POSTs it to a local Flask + **EasyOCR** service (`irctc-captcha-solver/app-server.py`, `/extract-text`), retrying up to 120 attempts on failure.
- **Tatkal timing logic** (`cypress/utils/index.js`): hard-codes 10:00 for AC classes and 11:00 for SL/2S, then busy-polls the DOM until the exact time appears, and recursively retries the "Book Now" click until the passenger form opens.
- **Passenger form fill**: adds passengers via DOM clicks, fills name/age/gender/berth/food via `formcontrolname` selectors, toggles "Book only if confirm berths" and "Auto Upgradation", picks UPI payment.
- **Second-stage captcha** on the review page, solved with the same OCR service, then a **Paytm/BHIM UPI gateway** (`/theia/processTransaction`) is driven to enter a UPI ID and wait for the human to pay.

Weaknesses to fix in the new app:
- DOM-selector fragility → replace with a typed HTTP driver + a Playwright fallback.
- Sequential, slow DOM clicks → replace with pre-computed HTTP payloads.
- EasyOCR-only captcha, ~1–2 s per solve and low accuracy → replace with a trained ONNX model + ensemble.
- Busy-polling instead of a precise timed fire → replace with BullMQ delayed jobs and clock-skew correction.
- No state persistence, no observability, no retry semantics → replace with Postgres state machine, OTel metrics, and BullMQ retries.
- Hardcoded credentials in `cypress.env.json` → encrypted-at-rest secrets.
- No human-in-the-loop payment → payment confirmation must be a human action.
