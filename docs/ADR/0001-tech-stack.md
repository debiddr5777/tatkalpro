# ADR-0001 — Technology stack

**Status:** Accepted · **Date:** 2026-10-26

## Context

TatkalPro must be free-forever, self-hosted, and open-source. Its critical path
is a millisecond-precise booking fire at the Tatkal window opening (T-0). The
original proposal suggested a Python/Celery stack; latency-critical code and
the frontend would then span two languages.

## Decision

**TypeScript end-to-end** (Node 22, Fastify, Drizzle, Next.js 15) with
**BullMQ** instead of Celery and **better-auth** instead of Authlib.

## Rationale

| Concern | Choice | Why |
|---|---|---|
| T-0 precision | BullMQ `delayed` jobs | Millisecond-precision scheduling; Celery's celery-beat is second-granular |
| One type system | TS across API, workers, web, driver | Zod contracts shared from DB to UI; no serialization boundary drift |
| Captcha on the critical path | onnxruntime-node in-process | A Python OCR sidecar adds a network hop of ~1–2 s (the reference repo's approach) — forbidden |
| Auth | better-auth (self-hosted, TS) | Equivalent to Authlib for this use case, no Python dependency |
| Everything else | PostgreSQL 16, Redis 7, REST + WebSockets, OTel + Prometheus + Grafana, Docker Compose, OpenAPI | As proposed — unchanged |

## Consequences

- The captcha training pipeline is still Python (PyTorch → ONNX export), but
  only offline — no Python runs at request time.
- BullMQ replaces Celery; the retry/backoff semantics are equivalent.
- The stack is smaller: one container base image (node:22-alpine) for all apps.
