#!/bin/bash

# Rebuild backend Docker image

set -e

echo "🛑 Stopping containers..."
docker-compose down

echo ""
echo "🔨 Rebuilding backend image..."
docker-compose build --no-cache backend

echo ""
echo "🚀 Starting PostgreSQL..."
docker-compose up postgres -d

echo ""
echo "⏳ Waiting for PostgreSQL to be healthy..."
sleep 10

echo ""
echo "🚀 Starting backend..."
docker-compose up backend -d

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "📋 Container status:"
docker-compose ps

echo ""
echo "📋 Backend logs (last 20 lines):"
docker-compose logs --tail=20 backend

echo ""
echo "✅ If container is running, check health:"
echo "   curl http://localhost:2000/health"
