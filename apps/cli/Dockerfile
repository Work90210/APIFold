FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/transformer/package.json packages/transformer/
COPY packages/types/package.json packages/types/
COPY packages/logger/package.json packages/logger/
COPY packages/tsconfig/ packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/cli/package.json apps/cli/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/transformer/node_modules ./packages/transformer/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/logger/node_modules ./packages/logger/node_modules
COPY --from=deps /app/apps/cli/node_modules ./apps/cli/node_modules
COPY . .
RUN pnpm --filter @apifold/transformer build && \
    pnpm --filter @apifold/types build && \
    pnpm --filter @apifold/logger build && \
    pnpm --filter @apifold/cli build

FROM node:20-alpine AS runtime
RUN addgroup -g 1001 -S apifold && adduser -S apifold -u 1001
WORKDIR /app
COPY --from=build --chown=apifold:apifold /app/apps/cli/dist ./dist
COPY --from=build --chown=apifold:apifold /app/apps/cli/node_modules ./node_modules
COPY --from=build --chown=apifold:apifold /app/apps/cli/package.json ./
COPY --from=build --chown=apifold:apifold /app/packages/transformer/dist ./node_modules/@apifold/transformer/dist
COPY --from=build --chown=apifold:apifold /app/packages/types/dist ./node_modules/@apifold/types/dist
COPY --from=build --chown=apifold:apifold /app/packages/logger/dist ./node_modules/@apifold/logger/dist
USER apifold
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
ENTRYPOINT ["node", "dist/index.js"]
CMD ["serve"]
