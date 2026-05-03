FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS pruner
COPY . .
RUN turbo prune --scope=@aggregator/api --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci

FROM installer AS builder
COPY --from=pruner /app/out/full/ .
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN turbo run build --filter=@aggregator/api...

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiuser
COPY --from=builder --chown=apiuser:nodejs /app .
USER apiuser
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
