# Deployment Guide: Local Build Method

## Overview

This deployment method builds Docker images **on your local machine** and transfers them to the production server. No Docker registry required.

---

## When to Use This Method

✅ **Use local build when:**
- No internet access on production server
- GitHub Container Registry not accessible
- Restricted network environment
- You want full control over build process
- Testing before setting up CI/CD

❌ **Don't use if:**
- You want automated deployments
- Multiple developers need to deploy
- You need deployment history/rollback
- Server has better specs than your laptop

---

## Prerequisites

### Required Tools

**On local machine:**
```bash
# Docker
docker --version  # Docker version 20.0+

# sshpass (for automated SSH)
sudo apt-get install sshpass  # Ubuntu/Debian
brew install hudochenkov/sshpass/sshpass  # macOS

# SSH access
ssh root@100.105.129.19  # Should connect without errors
```

### Server Requirements

**On production server:**
```bash
# Docker installed
docker --version

# Network configured
docker network ls | grep tb40-network

# Environment file exists
ls /root/tb40-frontend/.env
```

---

## Quick Start

### Automated Deployment Script

```bash
# From project root
cd ~/Project/tb40-fe

# Run deployment script
./scripts/deploy-local.sh
```

**What it does:**
1. ✅ Builds Docker image locally (~60s)
2. ✅ Saves image to tar.gz (~10s)
3. ✅ Transfers to server via SCP (~30s)
4. ✅ Loads image on server (~10s)
5. ✅ Stops old container
6. ✅ Starts new container
7. ✅ Verifies deployment
8. ✅ Cleans up temporary files

**Total time:** ~2-3 minutes

---

## Manual Step-by-Step

If you prefer to run commands manually:

### Step 1: Build Image Locally

```bash
cd ~/Project/tb40-fe

# Build Docker image
docker build -t tb40-frontend:latest .

# Verify build
docker images | grep tb40-frontend
```

**Expected output:**
```
tb40-frontend   latest   abc123def456   2 minutes ago   500MB
```

---

### Step 2: Save Image to Tar

```bash
# Save and compress image
docker save tb40-frontend:latest | gzip > tb40-frontend.tar.gz

# Check file size
ls -lh tb40-frontend.tar.gz
```

**Expected size:** ~100-500MB (depending on dependencies)

---

### Step 3: Transfer to Server

```bash
# Transfer via SCP
scp tb40-frontend.tar.gz root@100.105.129.19:/tmp/

# Or with sshpass (no password prompt)
sshpass -p 'cemara153' scp tb40-frontend.tar.gz root@100.105.129.19:/tmp/
```

**Transfer time:** ~30-60 seconds (depends on connection speed)

---

### Step 4: Deploy on Server

```bash
# SSH into server
ssh root@100.105.129.19

# Load image from tar
cd /tmp
docker load < tb40-frontend.tar.gz

# Verify image loaded
docker images | grep tb40-frontend

# Stop old container
docker stop tb40-frontend
docker rm tb40-frontend

# Start new container
docker run -d \
  --name tb40-frontend \
  --restart unless-stopped \
  --network tb40-network \
  -p 3000:3030 \
  --env-file /root/tb40-frontend/.env \
  tb40-frontend:latest

# Verify running
docker ps | grep tb40-frontend

# Cleanup
rm -f /tmp/tb40-frontend.tar.gz
```

---

### Step 5: Verify Deployment

```bash
# Check container logs
docker logs tb40-frontend --tail 20

# Test from server
curl -I http://localhost:3000

# Test from outside
curl -I https://tb40.insanmustaqbal.or.id/
```

---

## Script Customization

### Edit Configuration

```bash
# Open script
nano scripts/deploy-local.sh

# Modify these variables:
IMAGE_NAME="tb40-frontend:latest"        # Change image name
SERVER_HOST="100.105.129.19"             # Change server IP
SERVER_USER="root"                        # Change SSH user
SERVER_PASS="cemara153"                   # Change SSH password
CONTAINER_NAME="tb40-frontend"           # Change container name
NETWORK="tb40-network"                    # Change Docker network
```

### Add Custom Steps

```bash
# Add after Step 4 (before cleanup)
echo -e "${YELLOW}[Extra]${NC} Running database migrations..."
sshpass -p "$SERVER_PASS" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
docker exec tb40-frontend npm run migrate
ENDSSH
```

---

## Troubleshooting

### Build Fails Locally

**Error:** `ERROR [internal] load metadata`

**Solution:**
```bash
# Check Dockerfile exists
ls -la Dockerfile

# Check Docker daemon running
docker ps

# Try with cache disabled
docker build --no-cache -t tb40-frontend:latest .
```

---

### Transfer Times Out

**Error:** `ssh: connect to host 100.105.129.19 port 22: Connection timed out`

**Solution:**
```bash
# Check server is reachable
ping 100.105.129.19

# Check SSH port
telnet 100.105.129.19 22

# Try direct SSH first
ssh root@100.105.129.19
```

---

### Image Load Fails

**Error:** `Error processing tar file(exit status 1): unexpected EOF`

**Solution:**
```bash
# Tar file corrupted during transfer
# Check file size matches:

# On local machine
ls -lh tb40-frontend.tar.gz

# On server
ssh root@100.105.129.19 'ls -lh /tmp/tb40-frontend.tar.gz'

# If different, transfer again
rm tb40-frontend.tar.gz
docker save tb40-frontend:latest | gzip > tb40-frontend.tar.gz
scp tb40-frontend.tar.gz root@100.105.129.19:/tmp/
```

---

### Container Won't Start

**Error:** Container exits immediately after starting

**Solution:**
```bash
# Check logs
ssh root@100.105.129.19 'docker logs tb40-frontend'

# Common issues:

# 1. Missing .env file
ssh root@100.105.129.19 'ls -la /root/tb40-frontend/.env'

# 2. Port already in use
ssh root@100.105.129.19 'docker ps | grep 3000'

# 3. Network doesn't exist
ssh root@100.105.129.19 'docker network ls | grep tb40-network'

# Create network if missing
ssh root@100.105.129.19 'docker network create tb40-network'
```

---

### Out of Disk Space

**Error:** `no space left on device`

**Solution:**
```bash
# Check disk space
ssh root@100.105.129.19 'df -h'

# Clean up old images
ssh root@100.105.129.19 'docker image prune -a -f'

# Remove unused containers
ssh root@100.105.129.19 'docker container prune -f'

# Remove build cache
ssh root@100.105.129.19 'docker builder prune -f'
```

---

## Performance Optimization

### Faster Builds

```bash
# Use BuildKit (faster builds)
export DOCKER_BUILDKIT=1
docker build -t tb40-frontend:latest .

# Build with multiple cores
docker build --cpu-quota=400000 -t tb40-frontend:latest .

# Use layer caching effectively
# (Dockerfile already optimized with multi-stage builds)
```

### Faster Transfers

```bash
# Use better compression
docker save tb40-frontend:latest | pigz -9 > tb40-frontend.tar.gz

# Or use rsync for resume capability
rsync -avz --progress tb40-frontend.tar.gz root@100.105.129.19:/tmp/

# Or parallel transfer (if file is huge)
split -b 100M tb40-frontend.tar.gz part_
scp part_* root@100.105.129.19:/tmp/
ssh root@100.105.129.19 'cat /tmp/part_* > /tmp/tb40-frontend.tar.gz'
```

---

## Rollback Procedure

### Method 1: Keep Previous Image

```bash
# Before deployment, tag current image
ssh root@100.105.129.19 'docker tag tb40-frontend:latest tb40-frontend:backup'

# If new version fails, rollback
ssh root@100.105.129.19 << 'ENDSSH'
docker stop tb40-frontend
docker rm tb40-frontend
docker run -d --name tb40-frontend --restart unless-stopped --network tb40-network -p 3000:3030 --env-file /root/tb40-frontend/.env tb40-frontend:backup
ENDSSH
```

### Method 2: Deploy Old Tar

```bash
# Keep old tar files with version tags
mv tb40-frontend.tar.gz tb40-frontend-v1.2.3.tar.gz

# To rollback, deploy old tar
scp tb40-frontend-v1.2.2.tar.gz root@100.105.129.19:/tmp/tb40-frontend.tar.gz
./scripts/deploy-local.sh
```

---

## Comparison: Local vs CI/CD

| Aspect | Local Build | GitHub Actions CI/CD |
|--------|-------------|----------------------|
| **Build location** | Your laptop | GitHub servers |
| **Build time** | 60s (your CPU) | 60s (GitHub CPU) |
| **Transfer time** | 30-60s | ~10s (server pulls) |
| **Total time** | ~2-3 minutes | ~2 minutes |
| **Automation** | Manual script | Fully automated |
| **Network required** | Yes (transfer) | Yes (pull image) |
| **Rollback** | Manual | One command |
| **Version history** | Manual tagging | Automatic |
| **Multi-developer** | Each builds locally | Central registry |
| **Cost** | $0 | $0 (free tier) |

---

## Security Considerations

### Password in Script

⚠️ **Current:** Password stored in plain text

✅ **Better:** Use SSH keys

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "deployment-key"

# Copy to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@100.105.129.19

# Update script (remove sshpass, use ssh directly)
scp tb40-frontend.tar.gz root@100.105.129.19:/tmp/
ssh root@100.105.129.19 'docker load < /tmp/tb40-frontend.tar.gz'
```

### Tar File Security

```bash
# Don't commit tar files to git
echo "*.tar.gz" >> .gitignore

# Delete after deployment
rm -f tb40-frontend.tar.gz

# Use encrypted transfer (SCP already uses SSH encryption)
```

---

## CI/CD Migration Path

When ready to upgrade to automated CI/CD:

1. **Keep using local builds** for now
2. **Test GitHub Actions** with staging environment
3. **Switch production** once confident
4. **Keep local script** as emergency backup

**Migration guide:** [DEPLOYMENT_GHCR.md](./DEPLOYMENT_GHCR.md)

---

## Alternative: Direct Build on Server

If you prefer building on server (original method):

```bash
ssh root@100.105.129.19
cd /root/tb40-frontend
git pull
docker build -t tb40-frontend:latest .
docker stop tb40-frontend && docker rm tb40-frontend
docker run -d --name tb40-frontend --restart unless-stopped --network tb40-network -p 3000:3030 --env-file .env tb40-frontend:latest
```

**Trade-off:**
- ✅ No file transfer needed
- ❌ Uses production server CPU during build
- ❌ Longer downtime

---

## Quick Reference

### One-Line Deployment

```bash
cd ~/Project/tb40-fe && ./scripts/deploy-local.sh
```

### Check Deployment Status

```bash
ssh root@100.105.129.19 'docker ps | grep tb40-frontend'
```

### View Logs

```bash
ssh root@100.105.129.19 'docker logs tb40-frontend --tail 50 -f'
```

### Emergency Rollback

```bash
ssh root@100.105.129.19 'docker run -d --name tb40-frontend --restart unless-stopped --network tb40-network -p 3000:3030 --env-file /root/tb40-frontend/.env tb40-frontend:backup'
```

---

## Related Documentation

- [Deployment via GHCR (CI/CD)](./DEPLOYMENT_GHCR.md)
- [Deployment Comparison](./DEPLOYMENT_COMPARISON.md)
- [Rollback Guide](./ROLLBACK.md)
- [Server Setup](./SERVER_SETUP.md)

---

**Last Updated:** 2026-06-24  
**Method:** Local build + SCP transfer  
**Script:** `scripts/deploy-local.sh`
