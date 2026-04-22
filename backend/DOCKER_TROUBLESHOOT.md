# 🔧 Docker Troubleshooting Guide

## 🐛 Container Restarting Issue

If you see: `Container is restarting, wait until the container is running`

### Check Container Logs

```bash
# Check backend logs
docker-compose logs backend

# Or for development
docker-compose -f docker-compose.dev.yml logs backend

# Follow logs in real-time
docker-compose logs -f backend
```

### Common Causes & Fixes

#### 1. Database Connection Failed
**Symptom:** Backend can't connect to PostgreSQL

**Fix:**
```bash
# Make sure PostgreSQL is running
docker-compose ps postgres

# Start PostgreSQL first
docker-compose up postgres -d

# Wait for PostgreSQL to be healthy
docker-compose ps postgres

# Then start backend
docker-compose up backend -d
```

#### 2. Missing Environment Variables
**Symptom:** Warnings about unset variables

**Fix:** Create/update `.env` file:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/makulutu
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
MEGAPAY_API_KEY=your-key
MEGAPAY_MERCHANT_ID=your-id
MEGAPAY_API_URL=https://api.megapay.com
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-id
WHATSAPP_API_VERSION=v22.0
```

#### 3. Prisma Client Not Generated
**Symptom:** Prisma errors in logs

**Fix:**
```bash
# Stop containers
docker-compose down

# Rebuild
docker-compose build --no-cache backend

# Start again
docker-compose up -d
```

#### 4. Port Already in Use
**Symptom:** Port binding errors

**Fix:**
```bash
# Check what's using the port
lsof -i :2000
lsof -i :5433

# Stop conflicting services or change ports in docker-compose.yml
```

## 🔍 Diagnostic Commands

### Check Container Status
```bash
docker-compose ps
docker ps -a | grep makulutu
```

### View Container Logs
```bash
# Backend logs
docker-compose logs backend

# PostgreSQL logs
docker-compose logs postgres

# All logs
docker-compose logs
```

### Enter Container Shell
```bash
# Wait for container to be running first
docker-compose exec backend sh

# Or if container keeps restarting
docker run -it --rm --entrypoint sh guyoDev254/makulutu-backend:latest
```

### Check Database Connection
```bash
# From host
psql -h localhost -p 5433 -U postgres -d makulutu

# From backend container
docker-compose exec backend yarn prisma db push
```

## 🚀 Quick Fix Steps

1. **Stop all containers:**
   ```bash
   docker-compose down
   ```

2. **Check logs:**
   ```bash
   docker-compose logs backend
   ```

3. **Start PostgreSQL first:**
   ```bash
   docker-compose up postgres -d
   ```

4. **Wait for PostgreSQL to be healthy:**
   ```bash
   docker-compose ps postgres
   ```

5. **Start backend:**
   ```bash
   docker-compose up backend -d
   ```

6. **Check logs:**
   ```bash
   docker-compose logs -f backend
   ```

## 📋 Common Solutions

### Restart Everything
```bash
docker-compose down
docker-compose up -d
```

### Rebuild Containers
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Reset Database
```bash
docker-compose down -v  # ⚠️ Deletes all data
docker-compose up -d
docker-compose exec backend yarn prisma migrate dev
docker-compose exec backend yarn prisma:seed
```

---

**Check logs first to identify the issue!** 🔍
