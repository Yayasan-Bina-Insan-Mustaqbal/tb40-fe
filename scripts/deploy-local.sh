#!/bin/bash

# TB40 Frontend - Local Build & Deploy Script
# Builds Docker image locally and transfers to production server

set -e  # Exit on error

# Configuration
IMAGE_NAME="tb40-frontend:latest"
TAR_FILE="tb40-frontend.tar.gz"
SERVER_HOST="100.105.129.19"
SERVER_USER="root"
SERVER_PASS="cemara153"
CONTAINER_NAME="tb40-frontend"
NETWORK="tb40-network"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TB40 Frontend Deployment${NC}"
echo -e "${BLUE}  Method: Local Build + Transfer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Build Docker image locally
echo -e "${YELLOW}[1/5]${NC} Building Docker image locally..."
if docker build -t "$IMAGE_NAME" . ; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Step 2: Save image to tar file
echo -e "${YELLOW}[2/5]${NC} Saving image to tar file..."
if docker save "$IMAGE_NAME" | gzip > "$TAR_FILE" ; then
    SIZE=$(du -h "$TAR_FILE" | cut -f1)
    echo -e "${GREEN}✓ Image saved: $TAR_FILE ($SIZE)${NC}"
else
    echo -e "${RED}✗ Save failed${NC}"
    exit 1
fi
echo ""

# Step 3: Transfer to server
echo -e "${YELLOW}[3/5]${NC} Transferring to production server..."
if sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$TAR_FILE" "$SERVER_USER@$SERVER_HOST:/tmp/" ; then
    echo -e "${GREEN}✓ Transfer complete${NC}"
else
    echo -e "${RED}✗ Transfer failed${NC}"
    exit 1
fi
echo ""

# Step 4: Deploy on server
echo -e "${YELLOW}[4/5]${NC} Deploying on production server..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

echo "  ➤ Loading Docker image..."
docker load < /tmp/tb40-frontend.tar.gz

echo "  ➤ Stopping old container..."
docker stop tb40-frontend 2>/dev/null || true
docker rm tb40-frontend 2>/dev/null || true

echo "  ➤ Starting new container..."
docker run -d \
  --name tb40-frontend \
  --restart unless-stopped \
  --network tb40-network \
  -p 3000:3030 \
  --env-file /root/tb40-frontend/.env \
  tb40-frontend:latest

echo "  ➤ Waiting for container to start..."
sleep 3

if docker ps | grep -q tb40-frontend; then
  echo "  ✓ Container running"
  docker ps | grep tb40-frontend
else
  echo "  ✗ Container failed to start"
  docker logs tb40-frontend --tail 20
  exit 1
fi

echo "  ➤ Cleaning up..."
rm -f /tmp/tb40-frontend.tar.gz

ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi
echo ""

# Step 5: Cleanup local tar file
echo -e "${YELLOW}[5/5]${NC} Cleaning up local files..."
rm -f "$TAR_FILE"
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Production URL:${NC} https://tb40.insanmustaqbal.or.id/"
echo -e "${BLUE}Check status:${NC} ssh $SERVER_USER@$SERVER_HOST 'docker ps | grep tb40-frontend'"
echo ""
