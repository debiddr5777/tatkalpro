FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter @tatkalpro/worker...
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/worker apps/worker
RUN pnpm --filter @tatkalpro/worker build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/worker/dist apps/worker/dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/worker/package.json apps/worker/
CMD ["node", "apps/worker/dist/index.js"]
