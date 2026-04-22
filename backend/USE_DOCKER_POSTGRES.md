# 🐘 Use Docker PostgreSQL Instead of Supabase

## ✅ Updated Configuration

Both `docker-compose.yml` and `docker-compose.dev.yml` now use the PostgreSQL Docker image instead of external Supabase.

## 🚀 Quick Start

### 1. Start PostgreSQL Container

```bash
cd backend

# Start PostgreSQL only
docker-compose up postgres -d

# Or start everything (development)
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Update Local .env (for local development)

If you want to run Prisma commands locally (not in Docker), update your `.env`:

```env
# Use Docker PostgreSQL (port 5433 on host)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/makulutu
```

### 3. Run Migrations

**Option A: Using Docker (Recommended)**
```bash
docker-compose -f docker-compose.dev.yml exec backend yarn prisma migrate dev
```

**Option B: Locally**
```bash
# Make sure .env has DATABASE_URL pointing to localhost:5433
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/makulutu"
yarn prisma migrate dev
```

## 📋 Database Connection Details

### Inside Docker Containers
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/makulutu
```
- Host: `postgres` (service name)
- Port: `5432` (internal Docker network)
- Database: `makulutu`
- User: `postgres`
- Password: `postgres`

### From Host Machine (Local Development)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/makulutu
```
- Host: `localhost`
- Port: `5433` (mapped from container's 5432)
- Database: `makulutu`
- User: `postgres`
- Password: `postgres`

## 🔧 Verify Connection

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec backend yarn prisma db push
```

## 📊 Access Database

### From Host Machine
```bash
psql -h localhost -p 5433 -U postgres -d makulutu
```

### From Docker Container
```bash
docker-compose exec postgres psql -U postgres -d makulutu
```

## 🗄️ Database Operations

### Create Migration
```bash
docker-compose -f docker-compose.dev.yml exec backend yarn prisma migrate dev --name add_settings_model
```

### Seed Database
```bash
docker-compose -f docker-compose.dev.yml exec backend yarn prisma:seed
```

### Reset Database
```bash
docker-compose -f docker-compose.dev.yml exec backend yarn prisma migrate reset
```

## 🛑 Stop PostgreSQL

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

---

**Now using Docker PostgreSQL instead of Supabase!** 🐘
