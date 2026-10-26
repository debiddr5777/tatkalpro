.PHONY: dev bootstrap db-up db-down migrate test lint typecheck record-irctc

bootstrap:            ## install all workspace deps
	pnpm install

db-up:                ## start postgres + redis + observability
	docker compose up -d postgres redis prometheus grafana loki

db-down:              ## stop the stack
	docker compose down

dev:                  ## run api + worker + web with hot reload (needs db-up)
	docker compose up -d postgres redis prometheus grafana loki
	pnpm dev

migrate:              ## apply database migrations
	pnpm --filter @tatkalpro/db migrate

test:                 ## run all tests
	pnpm test

lint:                 ## lint everything
	pnpm lint

typecheck:            ## typecheck everything
	pnpm typecheck

record-irctc:         ## capture a HAR of the real IRCTC booking flow
	pnpm --filter @tatkalpro/booking-engine record:irctc
