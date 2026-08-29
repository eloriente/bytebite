# --- Dependencies ---
FROM node:26-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# --- Build ---
FROM node:26-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# --- Runtime ---
FROM node:26-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG VERSION=dev
ARG VCS_REF=dev
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="bytebite" \
  org.opencontainers.image.description="PWA mobile-first para gestionar dietas: subida de PDF (IA) o entrada manual, checklist diario y multi-dieta." \
  org.opencontainers.image.source="https://github.com/eloriente/bytebite" \
  org.opencontainers.image.licenses="AGPL-3.0-or-later" \
  org.opencontainers.image.version=$VERSION \
  org.opencontainers.image.revision=$VCS_REF \
  org.opencontainers.image.created=$BUILD_DATE

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/ node_modules/

RUN mkdir -p /app/prisma/data && chown -R nextjs:nodejs /app/prisma/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# /login no requiere sesión (ver middleware.ts) y siempre responde 200 sin tocar la BD,
# así que sirve como probe de "el proceso Next.js está vivo y respondiendo".
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --spider -q "http://127.0.0.1:${PORT}/login" || exit 1

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
