# 🐳 Docker Setup Guide

## 📋 Overview

This guide explains how to dockerize and run the NestJS backend using Docker.

## 🏗️ Files Created

- `Dockerfile` - Production build (multi-stage)
- `Dockerfile.dev` - Development build (with hot reload)
- `docker-compose.yml` - Production setup with PostgreSQL
- `docker-compose.dev.yml` - Development setup with hot reload
- `.dockerignore` - Files to exclude from Docker build

## 🚀 Quick Start

### Development Mode

```bash
# Build and start all services (backend + postgres)
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production Mode

```bash
# Build and start
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 🔧 Setup Steps

### 1. Environment Variables

Create or update `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mohagamer

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# MegaPay
MEGAPAY_API_KEY=your-api-key
MEGAPAY_MERCHANT_ID=your-merchant-id
MEGAPAY_API_URL=https://api.megapay.com

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_API_VERSION=v22.0

# PostgreSQL (for docker-compose)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mohagamer
```

### 2. Database Migrations

After starting the containers, run migrations:

```bash
# Development
docker-compose -f docker-compose.dev.yml exec backend yarn prisma migrate dev

# Production
docker-compose exec backend yarn prisma migrate deploy
```

### 3. Seed Database (Optional)

```bash
# Development
docker-compose -f docker-compose.dev.yml exec backend yarn prisma:seed

# Production
docker-compose exec backend yarn prisma:seed
```

## 📦 Building Images

### Build Production Image

```bash
docker build -t mohagamer-backend:latest .
```

### Build Development Image

```bash
docker build -f Dockerfile.dev -t mohagamer-backend:dev .
```

## 🐳 Docker Commands

### Run Container Manually

```bash
# Production
docker run -d \
  --name mohagamer-backend \
  -p 2000:2000 \
  --env-file .env \
  mohagamer-backend:latest

# Development
docker run -d \
  --name mohagamer-backend-dev \
  -p 2000:2000 \
  -v $(pwd):/app \
  --env-file .env \
  mohagamer-backend:dev
```

### View Logs

```bash
# Using docker-compose
docker-compose logs -f backend

# Using docker
docker logs -f mohagamer-backend
```

### Execute Commands in Container

```bash
# Using docker-compose
docker-compose exec backend sh

# Using docker
docker exec -it mohagamer-backend sh

# Run Prisma commands
docker-compose exec backend yarn prisma generate
docker-compose exec backend yarn prisma migrate dev
```

### Stop and Remove

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 🔍 Troubleshooting

### Port Already in Use

If port 2000 or 5432 is already in use:

```bash
# Change ports in docker-compose.yml
ports:
  - "2001:2000"  # Use different host port
```

### Database Connection Issues

1. Check PostgreSQL is running:
```bash
docker-compose ps postgres
```

2. Check database URL in .env matches docker-compose service name:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mohagamer
```

### Prisma Client Not Generated

```bash
docker-compose exec backend yarn prisma generate
```

### Permission Issues

If you encounter permission issues:

```bash
# Fix ownership
sudo chown -R $USER:$USER .
```

## 🎯 Production Deployment

### Build for Production

```bash
# Build image
docker build -t mohagamer-backend:latest .

# Tag for registry
docker tag mohagamer-backend:latest your-registry/mohagamer-backend:latest

# Push to registry
docker push your-registry/mohagamer-backend:latest
```

### Production Considerations

1. **Environment Variables**: Use secrets management (Docker secrets, Kubernetes secrets, etc.)
2. **Database**: Use managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
3. **Health Checks**: Already configured in Dockerfile
4. **Logging**: Configure log aggregation (ELK, CloudWatch, etc.)
5. **Monitoring**: Add APM tools (New Relic, Datadog, etc.)
6. **SSL/TLS**: Use reverse proxy (Nginx, Traefik) with SSL certificates

## 📊 Health Checks

The Dockerfile includes a health check:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' mohagamer-backend
```

## 🔐 Security Best Practices

1. ✅ Non-root user in production image
2. ✅ Multi-stage build to reduce image size
3. ✅ .dockerignore to exclude sensitive files
4. ✅ Environment variables for secrets
5. ✅ Health checks configured
6. ⚠️ Use secrets management in production
7. ⚠️ Scan images for vulnerabilities: `docker scan mohagamer-backend`

## 📝 Notes

- Development mode mounts source code for hot reload
- Production mode uses optimized multi-stage build
- PostgreSQL runs in separate container
- Volumes persist database data
- Networks isolate services

---

**Ready to dockerize!** 🐳
