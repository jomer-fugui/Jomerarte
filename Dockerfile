# syntax=docker/dockerfile:1
# Imagen de producción de Jomerarte (Next.js 16) para un VPS con Docker o Coolify.
# Compila el sitio y deja solo lo necesario para correrlo: imagen chica y sin dependencias de desarrollo.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── 1. Dependencias ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. Compilación ─────────────────────────────────────────────────────────────
# Ojo: NO se pasa DATABASE_URL acá. El build tiene que funcionar sin base de datos
# (el sitio consulta la base recién cuando arranca), así la imagen se puede compilar
# antes de tener la base lista.
FROM base AS builder
ENV NODE_ENV=production \
    BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── 3. Imagen final ────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# La caché de las páginas se escribe en disco: la carpeta tiene que ser del usuario de la app
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000

# Coolify y Docker muestran el estado del sitio con esto
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
