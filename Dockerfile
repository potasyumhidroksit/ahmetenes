FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ENV NODE_ENV=production
RUN pnpm build

FROM node:22-alpine AS runner
# libc6-compat keeps sharp/astro image tooling happy on musl.
RUN apk add --no-cache libc6-compat && corepack enable
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 astro
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4321
ENV HOST=0.0.0.0
COPY --from=deps --chown=astro:nodejs /app/node_modules ./node_modules
# Onceki surumun hash'li varliklari (deploy.sh doldurur): edge'de/tarayicida
# kalmis eski HTML de CSS/JS'ini bulsun. Yeni build ayni adlari ustune yazar.
COPY --from=builder --chown=astro:nodejs /app/.deploy/prev-assets/ ./dist/client/_astro/
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/public ./public
# Küratörlü galeri künyesi runtime'da okunur; imaja dahil edilmeli.
COPY --from=builder --chown=astro:nodejs /app/src/data ./src/data
COPY --from=builder --chown=astro:nodejs /app/seed ./seed
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json
COPY --from=builder --chown=astro:nodejs /app/astro.config.mjs ./astro.config.mjs
COPY --from=builder --chown=astro:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN mkdir -p /app/data && chown -R astro:nodejs /app/data
USER astro
EXPOSE 4321
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
