FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# postinstall prisma-generate-kassa.mjs ni chaqiradi — scripts/ hali yo'q
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=https://gormonik-plus-klinik.uz
ARG NEXT_PUBLIC_CLINIC_NAME="Garmonik Klinik"
ARG NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL=http://127.0.0.1:17888
ARG KASSA_LEGACY_HOST=
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLINIC_NAME=$NEXT_PUBLIC_CLINIC_NAME
ENV NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL=$NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL
ENV KASSA_LEGACY_HOST=$KASSA_LEGACY_HOST

RUN node scripts/merge/prisma-generate-kassa.mjs
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/supabase ./supabase
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# Migratsiya/seed skriptlari uchun to'liq node_modules (npx/tsx + lib importlari)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
