# Velatrix One · Projects — frontend (Next.js 16, salida "standalone")
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S velatrix && adduser -S velatrix -G velatrix
COPY --from=build --chown=velatrix:velatrix /app/.next/standalone ./
COPY --from=build --chown=velatrix:velatrix /app/.next/static ./.next/static
COPY --from=build --chown=velatrix:velatrix /app/public ./public
USER velatrix
EXPOSE 3000
# Requiere API_URL, SESSION_SECRET y BFF_SHARED_SECRET (ver .env.example).
CMD ["node", "server.js"]
