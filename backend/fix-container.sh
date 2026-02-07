#!/bin/bash

# Fix restarting container

set -e

echo "🛑 Stopping containers..."
docker-compose down

echo ""
echo "📋 Checking if PostgreSQL is needed..."
if ! docker ps | grep -q mohagamer-postgres; then
  echo "🚀 Starting PostgreSQL first..."
  docker-compose up postgres -d
  
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 5
fi

echo ""
echo "🔍 Checking PostgreSQL status..."
docker-compose ps postgres

echo ""
echo "🚀 Starting backend..."
docker-compose up backend -d

echo ""
echo "⏳ Waiting for backend to start..."
sleep 3

echo ""
echo "📋 Backend status:"
docker-compose ps backend

echo ""
echo "📋 Backend logs (last 30 lines):"
docker-compose logs --tail=30 backend

echo ""
echo "💡 If container is still restarting, check full logs:"
echo "   docker-compose logs backend"
