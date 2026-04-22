#!/bin/bash

# Quick push to Docker Hub script

set -e

DOCKERHUB_USERNAME=${1:-guyoDev254}
IMAGE_NAME=${2:-makulutu-backend}
TAG=${3:-latest}

FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"

echo "🐳 Pushing to Docker Hub..."
echo "Image: ${FULL_IMAGE_NAME}"
echo ""

# Check if local image exists
if docker images | grep -q "backend-backend.*latest"; then
  echo "✅ Found local image: backend-backend:latest"
  
  # Tag the image
  echo "📦 Tagging image..."
  docker tag backend-backend:latest ${FULL_IMAGE_NAME}
  
  # Login to Docker Hub
  echo ""
  echo "🔐 Logging in to Docker Hub..."
  docker login
  
  # Push the image
  echo ""
  echo "🚀 Pushing ${FULL_IMAGE_NAME}..."
  docker push ${FULL_IMAGE_NAME}
  
  echo ""
  echo "✅ Successfully pushed ${FULL_IMAGE_NAME}"
  echo ""
  echo "View at: https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
else
  echo "❌ Image backend-backend:latest not found"
  echo "Building first..."
  docker build --platform linux/amd64 -t ${FULL_IMAGE_NAME} -f Dockerfile .
  
  echo ""
  echo "🔐 Logging in to Docker Hub..."
  docker login
  
  echo ""
  echo "🚀 Pushing ${FULL_IMAGE_NAME}..."
  docker push ${FULL_IMAGE_NAME}
  
  echo ""
  echo "✅ Successfully pushed ${FULL_IMAGE_NAME}"
fi

echo ""
echo "To pull:"
echo "  docker pull ${FULL_IMAGE_NAME}"
