# 🐳 Docker Quick Start

## ⚡ Fast Setup (3 commands)

### Development Mode

```bash
# 1. Start everything
docker-compose -f docker-compose.dev.yml up --build

# 2. Run migrations (in new terminal)
docker-compose -f docker-compose.dev.yml exec backend yarn prisma migrate dev

# 3. Seed database (optional)
docker-compose -f docker-compose.dev.yml exec backend yarn prisma:seed
```

### Production Mode

```bash
# 1. Start everything
docker-compose up --build

# 2. Run migrations
docker-compose exec backend yarn prisma migrate deploy

# 3. Seed database (optional)
docker-compose exec backend yarn prisma:seed
```

## 🎯 Using Helper Script

```bash
# Make script executable (first time only)
chmod +x docker.sh

# Development
./docker.sh up-dev          # Start containers
./docker.sh logs-dev        # View logs
./docker.sh migrate-dev     # Run migrations
./docker.sh seed-dev        # Seed database
./docker.sh shell-dev       # Open shell

# Production
./docker.sh build           # Build image
./docker.sh up              # Start containers
./docker.sh logs            # View logs
./docker.sh migrate         # Run migrations
```

## 🔍 Verify It's Working

```bash
# Check health endpoint
curl http://localhost:2000/health

# Should return:
# {"status":"ok","timestamp":"2026-01-27T..."}
```

## 🛑 Stop Everything

```bash
# Development
docker-compose -f docker-compose.dev.yml down

# Production
docker-compose down
```

## 📋 What Gets Created

- **Backend Container**: NestJS API on port 2000
- **PostgreSQL Container**: Database on port 5432
- **Network**: Isolated Docker network
- **Volumes**: Persistent database storage

## ⚙️ Environment Variables

Create `.env` file in backend directory with:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/makulutu
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
# ... other variables
```

## 🐛 Troubleshooting

**Port already in use?**
- Change ports in docker-compose.yml

**Database connection error?**
- Wait for PostgreSQL to be healthy: `docker-compose ps`

**Prisma errors?**
- Run: `./docker.sh generate-dev`

---

**That's it!** 🚀
