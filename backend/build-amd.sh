#!/bin/bash

# Build Docker image for AMD64 architecture

set -e

IMAGE_NAME=${1:-mohagamer-backend}
TAG=${2:-latest}

echo "🐳 Building Docker image for AMD64 (linux/amd64)..."
echo "Image: ${IMAGE_NAME}:${TAG}"
echo ""

# Build for AMD64
docker build \
  --platform linux/amd64 \
  -t ${IMAGE_NAME}:${TAG} \
  -f Dockerfile .

echo ""
echo "✅ Successfully built ${IMAGE_NAME}:${TAG} for AMD64"
echo ""
echo "To verify architecture:"
echo "  docker inspect ${IMAGE_NAME}:${TAG} | grep Architecture"
echo ""
echo "To push:"
echo "  docker push ${IMAGE_NAME}:${TAG}"
