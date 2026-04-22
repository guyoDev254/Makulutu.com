#!/bin/bash

# Docker helper script for makulutu backend

set -e

COMMAND=${1:-help}

case $COMMAND in
  build)
    echo "🔨 Building production image..."
    docker build -t makulutu-backend:latest .
    ;;
  
  build-dev)
    echo "🔨 Building development image..."
    docker build -f Dockerfile.dev -t makulutu-backend:dev .
    ;;
  
  up)
    echo "🚀 Starting production containers..."
    docker-compose up -d
    ;;
  
  up-dev)
    echo "🚀 Starting development containers..."
    docker-compose -f docker-compose.dev.yml up -d
    ;;
  
  down)
    echo "🛑 Stopping containers..."
    docker-compose down
    ;;
  
  down-dev)
    echo "🛑 Stopping development containers..."
    docker-compose -f docker-compose.dev.yml down
    ;;
  
  logs)
    echo "📋 Viewing logs..."
    docker-compose logs -f backend
    ;;
  
  logs-dev)
    echo "📋 Viewing development logs..."
    docker-compose -f docker-compose.dev.yml logs -f backend
    ;;
  
  shell)
    echo "🐚 Opening shell in backend container..."
    docker-compose exec backend sh
    ;;
  
  shell-dev)
    echo "🐚 Opening shell in development container..."
    docker-compose -f docker-compose.dev.yml exec backend sh
    ;;
  
  migrate)
    echo "🗄️ Running migrations..."
    docker-compose exec backend yarn prisma migrate deploy
    ;;
  
  migrate-dev)
    echo "🗄️ Running development migrations..."
    docker-compose -f docker-compose.dev.yml exec backend yarn prisma migrate dev
    ;;
  
  generate)
    echo "⚙️ Generating Prisma client..."
    docker-compose exec backend yarn prisma generate
    ;;
  
  generate-dev)
    echo "⚙️ Generating Prisma client (dev)..."
    docker-compose -f docker-compose.dev.yml exec backend yarn prisma generate
    ;;
  
  seed)
    echo "🌱 Seeding database..."
    docker-compose exec backend yarn prisma:seed
    ;;
  
  seed-dev)
    echo "🌱 Seeding database (dev)..."
    docker-compose -f docker-compose.dev.yml exec backend yarn prisma:seed
    ;;
  
  restart)
    echo "🔄 Restarting containers..."
    docker-compose restart
    ;;
  
  restart-dev)
    echo "🔄 Restarting development containers..."
    docker-compose -f docker-compose.dev.yml restart
    ;;
  
  clean)
    echo "🧹 Cleaning up containers and volumes..."
    docker-compose down -v
    docker-compose -f docker-compose.dev.yml down -v
    ;;
  
  ps)
    echo "📊 Container status:"
    docker-compose ps
    ;;
  
  ps-dev)
    echo "📊 Development container status:"
    docker-compose -f docker-compose.dev.yml ps
    ;;
  
  help|*)
    echo "🐳 Docker Helper Script for Makulutu Backend"
    echo ""
    echo "Usage: ./docker.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build          Build production image"
    echo "  build-dev      Build development image"
    echo "  up             Start production containers"
    echo "  up-dev         Start development containers"
    echo "  down           Stop production containers"
    echo "  down-dev       Stop development containers"
    echo "  logs           View production logs"
    echo "  logs-dev       View development logs"
    echo "  shell          Open shell in production container"
    echo "  shell-dev      Open shell in development container"
    echo "  migrate        Run production migrations"
    echo "  migrate-dev    Run development migrations"
    echo "  generate       Generate Prisma client (production)"
    echo "  generate-dev   Generate Prisma client (development)"
    echo "  seed           Seed database (production)"
    echo "  seed-dev       Seed database (development)"
    echo "  restart        Restart production containers"
    echo "  restart-dev    Restart development containers"
    echo "  clean          Remove containers and volumes"
    echo "  ps             Show production container status"
    echo "  ps-dev         Show development container status"
    echo "  help           Show this help message"
    ;;
esac
