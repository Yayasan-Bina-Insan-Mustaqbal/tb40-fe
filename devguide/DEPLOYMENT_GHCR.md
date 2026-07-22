# Deployment Guide: GitHub Container Registry (GHCR)

## Overview

This project uses **GitHub Container Registry (GHCR)** for Docker image storage and **GitHub Actions** for automated CI/CD deployment.

---

## How It Works

### Automated Deployment Flow

```
1. Developer pushes code to main branch
   ↓
2. GitHub Actions triggers automatically
   ↓
3. Build Docker image on GitHub servers
   ↓
4. Push image to GHCR (ghcr.io)
   ↓
5. SSH into production server
   ↓
6. Pull new image from GHCR
   ↓
7. Stop old container, start new container
   ↓
8. Verify deployment, cleanup old images
```

---

## Initial Setup

### 1. Configure Repository Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `PRODUCTION_SERVER_HOST` | `100.105.129.19` | Production server IP |
| `PRODUCTION_SERVER_USER` | `root` | SSH username |
| `PRODUCTION_SERVER_PASSWORD` | `cemara153` | SSH password |

**Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions.

---

### 2. Enable GitHub Container Registry

**Already enabled!** GitHub automatically creates a container registry for each repository.

Your images will be at:
```
ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:main
ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:main-abc1234
ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:latest
```

---

### 3. Make Container Registry Public (Optional)

**If you want public access:**

1. Go to: https://github.com/orgs/Yayasan-Bina-Insan-Mustaqbal/packages
2. Click on `tb40-fe/frontend` package (after first push)
3. Click **Package settings**
4. Scroll to **Danger Zone**
5. Click **Change visibility** → **Public**

**Private is fine** - GitHub Actions has automatic access.

---

### 4. First Deployment

The workflow is already committed. To trigger it:

```bash
# Push to main branch
git push origin main

# Or manually trigger from GitHub UI:
# Actions → Deploy to Production → Run workflow
```

---

## Workflow Triggers

### Automatic Deployment

Deploys automatically when:
- Code pushed to `main` branch
- Changes in these paths:
  - `src/**`
  - `public/**`
  - `package.json`
  - `Dockerfile`
  - `.github/workflows/deploy-production.yml`

### Manual Deployment

Trigger manually via GitHub UI:
1. Go to **Actions** tab
2. Select **Deploy to Production**
3. Click **Run workflow**
4. Choose branch and environment

---

## Image Tagging Strategy

Each build creates multiple tags:

| Tag | Example | Purpose |
|-----|---------|--------|
| `main` | `main` | Latest main branch build (used for deployment) |
| `main-sha` | `main-73fd4cd` | Git commit SHA (for rollback) |
| `latest` | `latest` | Always points to latest main |

**Example:**
```
ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:main
ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:main-73fd4cd
ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:latest
```

---

## Monitoring Deployments

### GitHub Actions UI

1. Go to repository **Actions** tab
2. Click on latest workflow run
3. View logs for each step:
   - **build-and-push**: Docker build logs
   - **deploy**: Deployment logs from server

### Check Deployment Status

```bash
# View workflow status
gh workflow view deploy-production.yml

# View recent runs
gh run list --workflow=deploy-production.yml

# View specific run logs
gh run view <run-id> --log
```

### Server-Side Verification

```bash
# SSH into server
ssh root@100.105.129.19

# Check running container
docker ps | grep tb40-frontend

# View container logs
docker logs tb40-frontend --tail 50

# Check image tags
docker images ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend
```

---

## Rollback Procedure

### Method 1: Rollback to Specific Commit

```bash
# SSH into production server
ssh root@100.105.129.19

# Find available images
docker images ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend

# Stop current container
docker stop tb40-frontend
docker rm tb40-frontend

# Run previous version (replace SHA)
docker run -d \
  --name tb40-frontend \
  --restart unless-stopped \
  --network tb40-network \
  -p 3000:3030 \
  --env-file /root/tb40-frontend/.env \
  ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:main-abc1234
```

### Method 2: Re-deploy Older Commit

```bash
# Local machine - revert to specific commit
git checkout <commit-sha>
git push origin main --force

# GitHub Actions will automatically deploy old version
```

### Method 3: Manual GitHub Actions Trigger

1. Go to **Actions** → **Deploy to Production**
2. Click **Run workflow**
3. Select the older commit's branch/tag
4. Click **Run workflow**

---

## Troubleshooting

### Deployment Failed: "Could not resolve host ghcr.io"

**Cause:** Server can't reach GitHub Container Registry

**Solution:**
```bash
# On server, test connectivity
ping ghcr.io
curl -I https://ghcr.io

# If blocked, check firewall/DNS
```

---

### Deployment Failed: "authentication required"

**Cause:** Docker not logged into GHCR

**Solution:**
```bash
# The workflow handles login automatically
# If manual login needed:
echo "$GITHUB_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
```

---

### Deployment Failed: "no space left on device"

**Cause:** Server disk full from old images

**Solution:**
```bash
# SSH into server
ssh root@100.105.129.19

# Remove unused images
docker image prune -a -f

# Remove old GHCR images (keep latest 3)
docker images ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend \
  --format "{{.ID}} {{.CreatedAt}}" | \
  sort -rk 2 | tail -n +4 | awk '{print $1}' | \
  xargs -r docker rmi

# Check disk space
df -h
```

---

### Build Failed: "Dockerfile not found"

**Cause:** Workflow running from wrong directory

**Solution:**
Check `Dockerfile` exists in repository root:
```bash
ls -la Dockerfile
```

---

### Container Exits Immediately After Start

**Cause:** Environment variables missing or incorrect

**Solution:**
```bash
# Check .env file exists on server
ssh root@100.105.129.19 'ls -la /root/tb40-frontend/.env'

# View container logs
ssh root@100.105.129.19 'docker logs tb40-frontend'

# Check environment variables
ssh root@100.105.129.19 'docker exec tb40-frontend env | grep VITE'
```

---

## Cost & Rate Limits

### GitHub Container Registry

**Free Tier (Public repositories):**
- ∞ Unlimited storage
- ∞ Unlimited bandwidth
- ∞ Unlimited builds

**Private repositories:**
- 500MB storage (free)
- 1GB bandwidth/month (free)
- Extra: $0.25/GB storage, $0.50/GB bandwidth

### GitHub Actions

**Free Tier:**
- 2,000 minutes/month (Linux runners)
- Unlimited for public repositories

**Our usage:**
- ~2-3 minutes per deployment
- ~20-30 deployments = 60-90 minutes/month
- Well within free tier

---

## Security Best Practices

### Secrets Management

✅ **DO:**
- Store credentials in GitHub Secrets
- Use `GITHUB_TOKEN` for GHCR authentication
- Rotate server passwords regularly
- Use SSH keys instead of passwords (recommended upgrade)

❌ **DON'T:**
- Commit passwords to git
- Share secrets in workflow logs
- Use same password across environments

### Image Security

```yaml
# Scan images for vulnerabilities (add to workflow)
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main
    format: 'sarif'
    output: 'trivy-results.sarif'
```

---

## Performance Optimization

### Build Cache

The workflow uses Docker layer caching:
```yaml
cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

**Benefits:**
- First build: ~60-90 seconds
- Subsequent builds: ~20-40 seconds (with cache)

### Multi-Stage Builds

Ensure `Dockerfile` uses multi-stage builds:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
# ... build steps

# Production stage
FROM node:20-alpine AS production
COPY --from=builder /app/dist ./dist
# ... only production files
```

---

## Comparison: Old vs New Deployment

### Old Method (Build on Server)

```bash
# Manual steps
ssh root@100.105.129.19
cd /root/tb40-frontend
git pull
docker build -t tb40-frontend:latest .  # 60s on server
docker stop tb40-frontend && docker rm tb40-frontend
docker run -d ... tb40-frontend:latest
```

**Time:** ~90 seconds  
**Effort:** Manual SSH + commands  
**Server load:** High (build on production)  
**Rollback:** Manual git revert + rebuild  

### New Method (GHCR + CI/CD)

```bash
# Automated
git push origin main
# GitHub Actions handles everything
```

**Time:** ~120 seconds total (60s build on GitHub, 20s deploy)  
**Effort:** Zero (fully automated)  
**Server load:** Low (just pull + run)  
**Rollback:** One command or UI click  

---

## Advanced: Multi-Environment Setup

### Staging Environment

Create separate workflow for staging:

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [develop]

jobs:
  deploy:
    steps:
      - name: Deploy to staging server
        with:
          host: ${{ secrets.STAGING_SERVER_HOST }}
          # ... pull and run with :develop tag
```

### Production Protection

Enable branch protection:
1. **Settings** → **Branches**
2. Add rule for `main`
3. Enable:
   - Require pull request reviews
   - Require status checks (tests pass)
   - Lock branch

---

## Monitoring & Alerts

### GitHub Notifications

Configure email alerts:
1. **Settings** → **Notifications**
2. Enable **Actions** notifications
3. Receive email on deployment failure

### Slack Integration (Optional)

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ Deployment failed: ${{ github.sha }}"
      }
```

---

## Next Steps

1. ✅ **Test deployment** - Push a small change to trigger workflow
2. ✅ **Monitor first run** - Watch GitHub Actions logs
3. ✅ **Verify on server** - Check container is running
4. 🔒 **Upgrade to SSH keys** - Remove password authentication
5. 📊 **Add health checks** - Monitor deployment success
6. 🧹 **Set up alerts** - Get notified on failures

---

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Cache](https://docs.docker.com/build/cache/)
- [Deployment Rollback Guide](./ROLLBACK.md)

---

**Last Updated:** 2026-06-24  
**Workflow Version:** 1.0  
**Deployment Method:** GHCR + GitHub Actions
