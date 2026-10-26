# Runbook

## First run

```bash
cp .env.example .env
# set ENCRYPTION_KEY and JWT_SECRET:
openssl rand -hex 32   # twice
make db-up
pnpm install
pnpm --filter @tatkalpro/db migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 (Swagger at /docs)
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090

## Going live against real IRCTC

1. Capture a HAR: `pnpm record:irctc` and complete a booking by hand.
2. Update `docs/IRCTC_FLOW.md` from the capture.
3. Implement `HttpDriver` against the captured sequence.
4. Set `MOCK_IRCTC=false`.
5. Book against a **test journey** first; watch Grafana's latency panels.

## Captcha model

```bash
pnpm --filter @tatkalpro/captcha-solver harvest   # collect samples
# label via the UI, then:
python3 apps/captcha-solver/train/train.py        # train + export ONNX
```

## Troubleshooting

| Symptom | Check |
|---|---|
| API won't boot | `Invalid environment configuration` in logs — fix `.env` |
| Booking fires late | Grafana `tatkalpro_booking_arrival_delta_ms`; check NTP and clock skew |
| Captcha accuracy low | Label more samples, retrain; check `tatkalpro_captcha_accuracy_ratio` |
| Session expires mid-armed-window | Heartbeat every 4 min; see `tatkalpro_session_active_count` |
