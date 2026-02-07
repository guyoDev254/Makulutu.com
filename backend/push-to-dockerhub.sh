#!/bin/bash

# Push backend image to Docker Hub

set -e

# Configuration - UPDATE THESE
DOCKERHUB_USERNAME=${1:-guyoDev254}
IMAGE_NAME=${2:-mohagamer-backend}
TAG=${3:-latest}

FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"

echo "🐳 Pushing Docker image to Docker Hub..."
echo "Image: ${FULL_IMAGE_NAME}"
echo ""

# Check if image exists locally
if ! docker images | grep -q "${DOCKERHUB_USERNAME}/${IMAGE_NAME}"; then
  echo "⚠️  Image ${FULL_IMAGE_NAME} not found locally."
  echo "Building image first..."
  docker build --platform linux/amd64 -t ${FULL_IMAGE_NAME} -f Dockerfile .
fi

# Login to Docker Hub
echo ""
echo "🔐 Logging in to Docker Hub..."
echo "Enter your Docker Hub credentials:"
docker login

# Tag the image if needed
if ! docker images | grep -q "${DOCKERHUB_USERNAME}/${IMAGE_NAME}.*${TAG}"; then
  echo ""
  echo "📦 Tagging image..."
  docker tag backend-backend:latest ${FULL_IMAGE_NAME}
fi

# Push the image
echo ""
echo "🚀 Pushing ${FULL_IMAGE_NAME} to Docker Hub..."
docker push ${FULL_IMAGE_NAME}

echo ""
echo "✅ Successfully pushed ${FULL_IMAGE_NAME}"
echo ""
echo "To pull this image:"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo ""
echo "To use in docker-compose, update image:"
echo "  image: ${FULL_IMAGE_NAME}"
