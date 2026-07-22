#!/bin/bash
set -e

REPO_URL="https://github.com/Yayasan-Bina-Insan-Mustaqbal/tb40-fe.git"
BRANCH="feat/alternative-analytics"
APP_DIR="/root/projects/tb40-fe"
CONTAINER_NAME="tb40-app"
PORT=3030
DATA_DIR="/root/projects/tb40-data"

echo "=== TB40 Deploy Script ==="
echo "Branch: $BRANCH"
echo "Target dir: $APP_DIR"

# Ensure persistent data directory exists
mkdir -p "$DATA_DIR"

# Clone or update repo
if [ -d "$APP_DIR/.git" ]; then
  echo "Updating existing repo..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  echo "Cloning repo..."
  mkdir -p "$(dirname $APP_DIR)"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

cd "$APP_DIR"

# Stop and remove existing container if running
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping existing container..."
  docker stop "$CONTAINER_NAME" || true
  docker rm "$CONTAINER_NAME" || true
fi

# Build Docker image
echo "Building Docker image (this may take a few minutes)..."
docker build --no-cache -t tb40-app:latest .

# Run container with persistent volume for SQLite db
echo "Starting container on port $PORT..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$PORT:$PORT" \
  -e NODE_ENV=production \
  -e DATA_DIR=/app/data \
  -v "$DATA_DIR:/app/data" \
  tb40-app:latest

echo ""
echo "=== Deploy complete! ==="
echo "App running at: http://100.64.8.38:$PORT"
echo ""
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
