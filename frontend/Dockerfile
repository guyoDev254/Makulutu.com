# Multi-stage Next.js production image (linux/amd64 and arm64).
# NEXT_PUBLIC_API_URL is baked in at build time.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:2000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
RUN mkdir -p public
RUN yarn build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Standalone image has no `next` CLI. Hosts that run `yarn start` would fail otherwise.
RUN if [ -f package.json ]; then \
      node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); p.scripts=Object.assign({}, p.scripts, {start:'node server.js'}); fs.writeFileSync('package.json', JSON.stringify(p, null, 2));"; \
    else \
      printf '%s\n' '{"name":"makulutu-frontend","scripts":{"start":"node server.js"}}' > package.json; \
    fi \
 && chown nextjs:nodejs package.json

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
