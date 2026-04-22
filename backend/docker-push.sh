#!/bin/bash

# Docker push script for makulutu backend
#
# Docker Hub does NOT allow pushing a bare name like "makulutu-backend" — that maps to
# library/makulutu-backend (official images only). Use: YOUR_USERNAME/makulutu-backend
#
# If "failed to fetch oauth token: context canceled": retry (network/VPN flake), run
# `docker login docker.io` again, or push when the connection is stable.

set -e

REGISTRY=${3:-docker.io}
TAG=${2:-latest}
REPO_ARG=${1:-}

# Resolve image as namespace/repo (required for docker.io)
if [[ -n "$REPO_ARG" && "$REPO_ARG" == */* ]]; then
  IMAGE_NAME="$REPO_ARG"
elif [ -n "${DOCKERHUB_USER:-}" ]; then
  IMAGE_NAME="${DOCKERHUB_USER}/${REPO_ARG:-makulutu-backend}"
else
  echo "Docker Hub needs a namespace: username/repository"
  echo ""
  echo "  export DOCKERHUB_USER=your_dockerhub_username"
  echo "  ./docker-push.sh"
  echo ""
  echo "Or pass the full repo as the first argument:"
  echo "  ./docker-push.sh your_dockerhub_username/makulutu-backend"
  echo ""
  exit 1
fi

FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "🐳 Building and pushing Docker image..."
echo "Image: ${FULL_IMAGE_NAME}"
echo ""

echo "📦 Building image for linux/amd64..."
docker build --platform linux/amd64 -t "${FULL_IMAGE_NAME}" -f Dockerfile .

if [ "${TAG}" != "latest" ]; then
  docker tag "${FULL_IMAGE_NAME}" "${REGISTRY}/${IMAGE_NAME}:latest"
fi

echo ""
echo "🔐 Checking Docker login..."
if ! docker info 2>/dev/null | grep -q "Username"; then
  echo "Log in to the registry:"
  docker login "${REGISTRY}"
fi

echo ""
echo "🚀 Pushing image to ${REGISTRY}..."
if ! docker push "${FULL_IMAGE_NAME}"; then
  echo ""
  echo "Push failed. Common fixes:"
  echo "  • Retry — 'context canceled' is often a transient network timeout."
  echo "  • docker logout && docker login docker.io"
  echo "  • Confirm the image name is YOUR_USER/repo (not library/repo)."
  exit 1
fi

if [ "${TAG}" != "latest" ]; then
  docker push "${REGISTRY}/${IMAGE_NAME}:latest"
fi

echo ""
echo "✅ Successfully pushed ${FULL_IMAGE_NAME}"
echo ""
echo "To pull:"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo ""
echo "In docker-compose:"
echo "  image: ${FULL_IMAGE_NAME}"
echo ""
