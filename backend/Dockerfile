# Multi-stage build for NestJS backend
# Supports multi-platform: linux/amd64, linux/arm64

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL and other dependencies for Prisma
RUN apk add --no-cache openssl openssl-dev

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN yarn prisma generate

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Trim to production deps only (so production stage needs no network)
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Install OpenSSL and other dependencies for Prisma
RUN apk add --no-cache openssl openssl-dev

# Copy package.json, node_modules (prod + Prisma), prisma schema, and build from builder (no network)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 2000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:2000/health', (r) => {let b='';r.on('data',(d)=>{b+=d});r.on('end',()=>{process.exit(r.statusCode===200?0:1)})})"

# Start the application
CMD ["node", "dist/src/main"]
