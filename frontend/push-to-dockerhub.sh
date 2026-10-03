#!/bin/bash
# Build and push the Next.js frontend image to Docker Hub.
# Usage: ./push-to-dockerhub.sh [username] [image] [tag]
# Example: ./push-to-dockerhub.sh guyo254 makulutu-frontend latest

set -euo pipefail

DOCKERHUB_USERNAME="${1:-guyo254}"
IMAGE_NAME="${2:-makulutu-frontend}"
TAG="${3:-latest}"
FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"

# Browser-facing API origin (baked into the Next bundle at build time).
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.makulutu.com}"

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed or not on PATH."
  exit 1
fi

echo "Building ${FULL_IMAGE_NAME}"
echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
echo ""

docker build \
  --platform linux/amd64 \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  -t "${FULL_IMAGE_NAME}" \
  -f Dockerfile \
  .

echo "Pushing ${FULL_IMAGE_NAME}"
echo "If this fails with unauthorized, run: docker login"
if ! docker push "${FULL_IMAGE_NAME}"; then
  echo "Push failed. Log in and retry:"
  echo "  docker login"
  echo "  docker push ${FULL_IMAGE_NAME}"
  exit 1
fi

echo ""
echo "Pushed ${FULL_IMAGE_NAME}"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo "  https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
