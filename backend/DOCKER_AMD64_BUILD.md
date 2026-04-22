# 🐳 AMD64 Docker Build Guide

## ✅ Updated for AMD64 Architecture

All Dockerfiles have been updated to build for `linux/amd64` architecture, ensuring compatibility with:
- Cloud platforms (AWS, GCP, Azure)
- Most servers and VPS
- CI/CD pipelines
- Production deployments

## 🚀 Quick Build

### Option 1: Using the Script

```bash
cd backend
./build-amd.sh makulutu-backend latest
```

### Option 2: Manual Build

```bash
cd backend

# Build for AMD64
docker build --platform linux/amd64 -t makulutu-backend:latest -f Dockerfile .

# Or with docker-compose
docker-compose build --platform linux/amd64
```

## 📋 Build Commands

### Production Build

```bash
docker build \
  --platform linux/amd64 \
  -t makulutu-backend:latest \
  -f Dockerfile .
```

### Development Build

```bash
docker build \
  --platform linux/amd64 \
  -t makulutu-backend:dev \
  -f Dockerfile.dev .
```

### Build and Push

```bash
# Build for AMD64
docker build --platform linux/amd64 -t your-username/makulutu-backend:latest -f Dockerfile .

# Push to registry
docker push your-username/makulutu-backend:latest
```

## 🔍 Verify Architecture

```bash
# Check image architecture
docker inspect makulutu-backend:latest | grep Architecture

# Should show: "Architecture": "amd64"
```

## 🏗️ Multi-Platform Build (Optional)

If you want to build for multiple architectures:

```bash
# Create a builder instance
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-username/makulutu-backend:latest \
  -f Dockerfile \
  --push
```

## 📝 Docker Compose

The docker-compose files will automatically use the AMD64 platform when building:

```bash
# Build with docker-compose
docker-compose build

# Or explicitly specify platform
docker-compose build --build-arg BUILDPLATFORM=linux/amd64
```

## ✅ What Changed

1. **Dockerfile** - Added `--platform=linux/amd64` to both build stages
2. **Dockerfile.dev** - Added `--platform=linux/amd64`
3. **build-amd.sh** - New script for AMD64 builds
4. **docker-push.sh** - Updated to build for AMD64

## 🎯 Use Cases

- **Cloud Deployment**: AWS EC2, Google Cloud Run, Azure Container Instances
- **VPS/Server**: Most hosting providers use AMD64
- **CI/CD**: GitHub Actions, GitLab CI, CircleCI
- **Production**: Ensures consistent behavior across environments

---

**All builds are now configured for AMD64!** ✅
