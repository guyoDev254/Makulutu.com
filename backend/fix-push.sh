#!/bin/bash

# Fix and push to Docker Hub

set -e

DOCKERHUB_USERNAME=${1:-guyoDev254}
IMAGE_NAME=${2:-mohagamer-backend}
TAG=${3:-latest}

FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"

echo "🐳 Fixing image tag and pushing to Docker Hub..."
echo "Target: ${FULL_IMAGE_NAME}"
echo ""

# Remove any incorrectly tagged images
echo "🧹 Cleaning up old tags..."
docker rmi ${FULL_IMAGE_NAME} 2>/dev/null || true

# Tag the correct image (backend-backend:latest from docker-compose build)
echo "📦 Tagging image..."
if docker images | grep -q "backend-backend.*latest"; then
  docker tag backend-backend:latest ${FULL_IMAGE_NAME}
  echo "✅ Tagged backend-backend:latest as ${FULL_IMAGE_NAME}"
else
  echo "❌ Image backend-backend:latest not found"
  echo "Building image..."
  docker build --platform linux/amd64 -t ${FULL_IMAGE_NAME} -f Dockerfile .
fi

# Verify tag
echo ""
echo "📋 Tagged images:"
docker images | grep "${DOCKERHUB_USERNAME}/${IMAGE_NAME}"

# Login to Docker Hub
echo ""
echo "🔐 Logging in to Docker Hub..."
docker login

# Push the image
echo ""
echo "🚀 Pushing ${FULL_IMAGE_NAME} to Docker Hub..."
docker push ${FULL_IMAGE_NAME}

echo ""
echo "✅ Successfully pushed ${FULL_IMAGE_NAME}"
echo ""
echo "View at: https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
echo ""
echo "To pull:"
echo "  docker pull ${FULL_IMAGE_NAME}"
