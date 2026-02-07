# 🔧 Fix Restarting Container

## 🐛 Issue: Container Keeps Restarting

The backend container is crashing and restarting. Here's how to fix it:

## 🔍 Step 1: Check Logs

```bash
cd backend

# Check backend logs to see the error
docker-compose logs backend

# Or see last 50 lines
docker-compose logs --tail=50 backend

# Follow logs in real-time
docker-compose logs -f backend
```

## 🚀 Step 2: Fix and Restart

### Option A: Use the Fix Script

```bash
./fix-container.sh
```

### Option B: Manual Steps

```bash
# 1. Stop everything
docker-compose down

# 2. Start PostgreSQL first
docker-compose up postgres -d

# 3. Wait for PostgreSQL to be healthy (check status)
docker-compose ps postgres
# Wait until STATUS shows "healthy"

# 4. Start backend
docker-compose up backend -d

# 5. Check logs
docker-compose logs -f backend
```

## 🔧 Common Causes & Fixes

### 1. Database Connection Failed

**Error in logs:** `Can't reach database server` or `Connection refused`

**Fix:**
- Make sure PostgreSQL is running: `docker-compose ps postgres`
- Check DATABASE_URL is correct: `postgresql://postgres:postgres@postgres:5432/mohagamer`
- Wait for PostgreSQL to be healthy before starting backend

### 2. Prisma Client Missing

**Error in logs:** `Cannot find module '@prisma/client'`

**Fix:**
```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### 3. Missing Environment Variables

**Fix:** Create/update `.env` file with all required variables

### 4. Port Already in Use

**Fix:** Change port in docker-compose.yml or stop conflicting service

## ✅ Verify It's Working

```bash
# Check container status
docker-compose ps

# Should show "Up" not "Restarting"

# Check backend is responding
curl http://localhost:2000/health

# Should return: {"status":"ok","timestamp":"..."}
```

## 📋 Quick Diagnostic

```bash
# Run diagnostic script
./check-container.sh

# Or manually:
docker-compose ps
docker-compose logs --tail=50 backend
docker-compose logs --tail=20 postgres
```

---

**Check the logs first to identify the exact error!** 🔍
