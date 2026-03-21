FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/runtime/package.json ./apps/runtime/
COPY packages/types/package.json ./packages/types/
COPY packages/transformer/package.json ./packages/transformer/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/logger/package.json ./packages/logger/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/runtime/node_modules ./apps/runtime/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm turbo run build --filter=@apifold/runtime

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 runtime
COPY --from=builder /app/apps/runtime/dist ./dist
COPY --from=builder /app/apps/runtime/node_modules ./node_modules
COPY --from=builder /app/apps/runtime/package.json ./
USER runtime
EXPOSE 3001 9090
ENV RUNTIME_PORT=3001
CMD ["node", "dist/cluster.js"]
