# 🔧 Docker Hub Push Fix

## ❌ Issue

Docker is trying to resolve `guyoDev254` as a hostname instead of using Docker Hub registry.

## ✅ Solution: Use Explicit Registry

Tag and push with explicit `docker.io` registry:

### Manual Commands

```bash
cd backend

# 1. Tag with explicit docker.io registry
docker tag backend-backend:latest docker.io/guyoDev254/makulutu-backend:latest

# 2. Login to Docker Hub
docker login docker.io

# 3. Push
docker push docker.io/guyoDev254/makulutu-backend:latest
```

### Or Use the Fixed Script

```bash
cd backend
./push-dockerhub-fixed.sh
```

## 🔍 Alternative: Check Docker Configuration

If the issue persists, check Docker daemon configuration:

```bash
# Check Docker info
docker info | grep -i registry

# Try logging out and back in
docker logout
docker login docker.io
```

## 📋 Correct Image Name Format

**Correct:**
- `docker.io/guyoDev254/makulutu-backend:latest`
- `guyoDev254/makulutu-backend:latest` (defaults to docker.io)

**Incorrect:**
- `guyoDev254/v2/makulutu-backend:latest` (Docker is adding /v2/)

## ✅ After Successful Push

**View on Docker Hub:**
- https://hub.docker.com/r/guyoDev254/makulutu-backend

**Pull the image:**
```bash
docker pull guyoDev254/makulutu-backend:latest
```

---

**Run: `./push-dockerhub-fixed.sh`** 🚀
