# 🔧 Docker Port Conflict Fix

## ⚠️ Issue: Port 5432 Already in Use

If you see this error:
```
Error response from daemon: ports are not available: exposing port TCP 0.0.0.0:5432 -> 127.0.0.1:0: listen tcp 0.0.0.0:5432: bind: address already in use
```

It means PostgreSQL is already running on your machine.

## ✅ Solutions

### Option 1: Use Different Port (Recommended)

The docker-compose files have been updated to use port **5433** by default instead of 5432.

**Update your `.env` file:**
```env
# Use port 5433 for Docker PostgreSQL
POSTGRES_PORT=5433

# Update DATABASE_URL to match
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mohagamer
```

**Note:** Inside Docker containers, PostgreSQL still uses port 5432. Only the host port mapping changed to 5433.

### Option 2: Stop Local PostgreSQL

**macOS (Homebrew):**
```bash
brew services stop postgresql@15
# or
brew services stop postgresql
```

**Linux (systemd):**
```bash
sudo systemctl stop postgresql
```

**Then use port 5432:**
```env
POSTGRES_PORT=5432
```

### Option 3: Use Existing PostgreSQL

If you want to use your existing PostgreSQL instead of Docker's:

1. **Remove PostgreSQL service from docker-compose:**
   - Comment out the `postgres:` service
   - Remove `depends_on: postgres` from backend service

2. **Update DATABASE_URL in .env:**
   ```env
   DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/mohagamer
   ```

3. **Or connect to localhost:**
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mohagamer
   ```

## 🚀 Quick Fix

**Just run with the updated port:**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

PostgreSQL will be accessible on port **5433** from your host machine, but the backend container will connect to it on port **5432** (internal Docker network).

## 🔍 Verify

**Check if port is available:**
```bash
# Check port 5432
lsof -i :5432

# Check port 5433
lsof -i :5433
```

**Test connection:**
```bash
# From host (using port 5433)
psql -h localhost -p 5433 -U postgres -d mohagamer

# From Docker container (using port 5432)
docker-compose exec backend psql -h postgres -p 5432 -U postgres -d mohagamer
```

---

**Default port is now 5433 to avoid conflicts!** ✅
