#!/bin/bash

# Quick container diagnostics script

echo "🔍 Checking container status..."
docker-compose ps

echo ""
echo "📋 Backend logs (last 50 lines):"
docker-compose logs --tail=50 backend

echo ""
echo "📋 PostgreSQL logs (last 20 lines):"
docker-compose logs --tail=20 postgres

echo ""
echo "💡 To see live logs:"
echo "   docker-compose logs -f backend"
