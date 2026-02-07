#!/bin/bash

# Build Docker image for both AMD64 and ARM64 (multi-platform)

set -e

IMAGE_NAME=${1:-mohagamer-backend}
TAG=${2:-latest}
# Optional: Docker Hub repo for push (e.g. guyo254/mohagamer-backend)
PUSH_REPO=${3:-}

echo "🐳 Building Docker image for linux/amd64 and linux/arm64..."
echo "Image: ${IMAGE_NAME}:${TAG}"
echo ""

# Ensure buildx builder exists and supports multi-platform
docker buildx create --name multibuilder --use 2>/dev/null || docker buildx use multibuilder
docker buildx inspect --bootstrap

if [ -n "${PUSH_REPO}" ]; then
  echo "📤 Build and push to ${PUSH_REPO}:${TAG}"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "${PUSH_REPO}:${TAG}" \
    --push \
    -f Dockerfile .
  echo ""
  echo "✅ Pushed ${PUSH_REPO}:${TAG} (amd64 + arm64)"
  echo "Pull with: docker pull ${PUSH_REPO}:${TAG}"
else
  echo "📦 Build for both platforms (separate local tags; --load supports one platform per build)"
  docker buildx build --platform linux/amd64 -t "${IMAGE_NAME}:${TAG}-amd64" --load -f Dockerfile .
  echo ""
  docker buildx build --platform linux/arm64 -t "${IMAGE_NAME}:${TAG}-arm64" --load -f Dockerfile .
  echo ""
  echo "✅ Built ${IMAGE_NAME}:${TAG}-amd64 and ${IMAGE_NAME}:${TAG}-arm64"
  echo "To build and push a single multi-platform image to Docker Hub:"
  echo "  ./build-multi.sh ${IMAGE_NAME} ${TAG} guyo254/mohagamer-backend"
fi

echo ""
echo "To build and push both architectures to Docker Hub:"
echo "  ./build-multi.sh ${IMAGE_NAME} ${TAG} guyo254/mohagamer-backend"
echo ""
