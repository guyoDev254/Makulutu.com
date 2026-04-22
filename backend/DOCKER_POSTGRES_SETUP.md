# 🐘 Docker PostgreSQL Setup

## ✅ Using PostgreSQL Docker Image

The docker-compose files are configured to use the PostgreSQL Docker image instead of external Supabase database.

## 🚀 Quick Start

### Start PostgreSQL Container

```bash
cd backend

# Start PostgreSQL only
docker-compose up postgres -d

# Or start everything
docker-compose -f docker-compose.dev.yml up -d
```

### Run Migrations

```bash
# Using Docker
docker-compose exec backend yarn prisma migrate dev

# Or locally (if DATABASE_URL points to Docker PostgreSQL)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/makulutu"
yarn prisma migrate dev
```

## 📋 Database Connection

### Inside Docker Containers
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/makulutu
```

### From Host Machine
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/makulutu
```

**Note:** Port 5433 is used on host to avoid conflict with local PostgreSQL (if running).

## 🔧 Configuration

### docker-compose.yml (Production)
- PostgreSQL service name: `postgres`
- Internal port: `5432`
- Host port: `5433` (configurable via `POSTGRES_PORT`)
- Database: `makulutu`
- User: `postgres`
- Password: `postgres`

### docker-compose.dev.yml (Development)
- Same configuration as production
- Uses separate volume: `postgres_data_dev`

## 📊 Access Database

### From Host
```bash
# Connect using psql
psql -h localhost -p 5433 -U postgres -d makulutu

# Or using Docker
docker-compose exec postgres psql -U postgres -d makulutu
```

### From Backend Container
```bash
docker-compose exec backend sh
# Inside container, DATABASE_URL already configured
```

## 🗄️ Database Management

### Create Migration
```bash
docker-compose exec backend yarn prisma migrate dev --name migration_name
```

### Apply Migrations
```bash
docker-compose exec backend yarn prisma migrate deploy
```

### Seed Database
```bash
docker-compose exec backend yarn prisma:seed
```

### Reset Database
```bash
docker-compose exec backend yarn prisma migrate reset
```

## 🔍 Verify Connection

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection from backend
docker-compose exec backend yarn prisma db push
```

## 🛑 Stop PostgreSQL

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

## 📝 Environment Variables

Update your `.env` file:

```env
# For local development (connecting to Docker PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/makulutu

# For Docker containers (internal network)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/makulutu
```

---

**PostgreSQL Docker image is now configured!** 🐘
