#!/bin/bash

# Docker push script for mohagamer backend

set -e

# Configuration
IMAGE_NAME=${1:-mohagamer-backend}
TAG=${2:-latest}
REGISTRY=${3:-docker.io}  # Change to your registry (e.g., ghcr.io, registry.gitlab.com)

# Full image name
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "🐳 Building and pushing Docker image..."
echo "Image: ${FULL_IMAGE_NAME}"
echo ""

# Build the image for AMD64
echo "📦 Building image for linux/amd64..."
docker build --platform linux/amd64 -t ${FULL_IMAGE_NAME} -f Dockerfile .

# Optionally tag as latest
if [ "${TAG}" != "latest" ]; then
  docker tag ${FULL_IMAGE_NAME} ${REGISTRY}/${IMAGE_NAME}:latest
fi

# Login to registry (if not already logged in)
echo ""
echo "🔐 Checking Docker login..."
if ! docker info | grep -q "Username"; then
  echo "Please login to Docker registry:"
  docker login ${REGISTRY}
fi

# Push the image
echo ""
echo "🚀 Pushing image to ${REGISTRY}..."
docker push ${FULL_IMAGE_NAME}

if [ "${TAG}" != "latest" ]; then
  docker push ${REGISTRY}/${IMAGE_NAME}:latest
fi

echo ""
echo "✅ Successfully pushed ${FULL_IMAGE_NAME}"
echo ""
echo "To pull this image:"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo ""
echo "To use in docker-compose, update image:"
echo "  image: ${FULL_IMAGE_NAME}"
