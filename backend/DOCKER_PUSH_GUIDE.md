# 🐳 Docker Push Guide

## 🚀 Quick Push to Docker Hub

### Option 1: Using the Script

```bash
# Make script executable
chmod +x docker-push.sh

# Push to Docker Hub (default)
./docker-push.sh [your-dockerhub-username]/mohagamer-backend

# Push with specific tag
./docker-push.sh [your-dockerhub-username]/mohagamer-backend v1.0.0

# Push to GitHub Container Registry
./docker-push.sh ghcr.io/[your-username]/mohagamer-backend latest ghcr.io
```

### Option 2: Manual Commands

#### Docker Hub

```bash
# 1. Login to Docker Hub
docker login

# 2. Build the image
docker build -t [your-username]/mohagamer-backend:latest -f Dockerfile .

# 3. Push the image
docker push [your-username]/mohagamer-backend:latest
```

#### GitHub Container Registry (GHCR)

```bash
# 1. Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u [your-username] --password-stdin

# 2. Build the image
docker build -t ghcr.io/[your-username]/mohagamer-backend:latest -f Dockerfile .

# 3. Push the image
docker push ghcr.io/[your-username]/mohagamer-backend:latest
```

#### GitLab Container Registry

```bash
# 1. Login to GitLab
docker login registry.gitlab.com

# 2. Build the image
docker build -t registry.gitlab.com/[your-username]/mohagamer254/backend:latest -f Dockerfile .

# 3. Push the image
docker push registry.gitlab.com/[your-username]/mohagamer254/backend:latest
```

## 📋 Step-by-Step Instructions

### 1. Build the Image

```bash
cd backend
docker build -t mohagamer-backend:latest -f Dockerfile .
```

### 2. Tag for Registry

Replace `[your-username]` with your Docker Hub username:

```bash
# Docker Hub
docker tag mohagamer-backend:latest [your-username]/mohagamer-backend:latest

# Or with version tag
docker tag mohagamer-backend:latest [your-username]/mohagamer-backend:v1.0.0
```

### 3. Login to Registry

```bash
# Docker Hub
docker login

# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u [your-username] --password-stdin

# GitLab
docker login registry.gitlab.com
```

### 4. Push the Image

```bash
# Docker Hub
docker push [your-username]/mohagamer-backend:latest

# With version tag
docker push [your-username]/mohagamer-backend:v1.0.0
```

## 🔧 Using Pushed Image

### Update docker-compose.yml

```yaml
services:
  backend:
    image: [your-username]/mohagamer-backend:latest
    # Remove build section if using pre-built image
    # build:
    #   context: .
    #   dockerfile: Dockerfile
```

### Pull and Run

```bash
# Pull the image
docker pull [your-username]/mohagamer-backend:latest

# Run directly
docker run -d \
  --name mohagamer-backend \
  -p 2000:2000 \
  --env-file .env \
  [your-username]/mohagamer-backend:latest
```

## 🏷️ Tagging Best Practices

```bash
# Semantic versioning
docker tag mohagamer-backend:latest [username]/mohagamer-backend:1.0.0
docker tag mohagamer-backend:latest [username]/mohagamer-backend:1.0
docker tag mohagamer-backend:latest [username]/mohagamer-backend:1

# Push all tags
docker push [username]/mohagamer-backend:1.0.0
docker push [username]/mohagamer-backend:1.0
docker push [username]/mohagamer-backend:1
docker push [username]/mohagamer-backend:latest
```

## 🔐 Authentication

### Docker Hub Token

Create a personal access token at: https://hub.docker.com/settings/security

```bash
echo $DOCKERHUB_TOKEN | docker login -u [your-username] --password-stdin
```

### GitHub Token

Create a personal access token with `write:packages` permission:

```bash
export GITHUB_TOKEN=your_token_here
echo $GITHUB_TOKEN | docker login ghcr.io -u [your-username] --password-stdin
```

## 📊 Verify Push

```bash
# List local images
docker images | grep mohagamer-backend

# Check registry (Docker Hub)
# Visit: https://hub.docker.com/r/[your-username]/mohagamer-backend

# Pull to verify
docker pull [your-username]/mohagamer-backend:latest
```

## 🚨 Troubleshooting

### Authentication Failed
```bash
# Re-login
docker logout
docker login
```

### Permission Denied
- Ensure you're logged in
- Check image name matches your username
- Verify registry permissions

### Image Too Large
```bash
# Check image size
docker images [your-username]/mohagamer-backend

# Optimize Dockerfile (already multi-stage)
# Use .dockerignore (already configured)
```

---

**Ready to push!** 🚀
