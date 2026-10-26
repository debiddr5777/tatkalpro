FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter @tatkalpro/api...
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api apps/api
RUN pnpm --filter @tatkalpro/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/package.json apps/api/
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
