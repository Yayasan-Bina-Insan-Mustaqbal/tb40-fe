# GitHub Secrets Setup - Quick Checklist

## ✅ Step-by-Step Instructions

### 1. Go to Repository Settings

1. Open: https://github.com/Yayasan-Bina-Insan-Mustaqbal/tb40-fe
2. Click **Settings** (top menu)
3. In left sidebar: **Secrets and variables** → **Actions**

---

### 2. Add Production Server Secrets

Click **New repository secret** and add each of these:

#### Secret 1: `PRODUCTION_SERVER_HOST`
```
Name: PRODUCTION_SERVER_HOST
Value: 100.105.129.19
```
Click **Add secret**

#### Secret 2: `PRODUCTION_SERVER_USER`
```
Name: PRODUCTION_SERVER_USER
Value: root
```
Click **Add secret**

#### Secret 3: `PRODUCTION_SERVER_PASSWORD`
```
Name: PRODUCTION_SERVER_PASSWORD
Value: cemara153
```
Click **Add secret**

---

### 3. Verify Secrets

You should see 3 secrets listed:

✅ `PRODUCTION_SERVER_HOST`  
✅ `PRODUCTION_SERVER_USER`  
✅ `PRODUCTION_SERVER_PASSWORD`  

**Note:** Values are hidden after creation (this is normal).

---

### 4. Test the Workflow

#### Option A: Push a Change
```bash
cd ~/Project/tb40-fe
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger GitHub Actions deployment"
git push origin main
```

#### Option B: Manual Trigger
1. Go to **Actions** tab
2. Click **Deploy to Production** (left sidebar)
3. Click **Run workflow** (right side)
4. Select branch: `main`
5. Click green **Run workflow** button

---

### 5. Monitor First Deployment

1. Go to **Actions** tab
2. Click on the running workflow (yellow dot)
3. Watch the progress:
   - 🔨 **build-and-push** - Building Docker image (~60s)
   - 🚀 **deploy** - Deploying to server (~20s)
4. All green checks = Success! ✅

---

### 6. Verify on Production Server

```bash
ssh root@100.105.129.19

# Check container is running
docker ps | grep tb40-frontend

# Verify it pulled from GHCR
docker images | grep ghcr.io
```

You should see:
```
CONTAINER ID   IMAGE                                                     ...
xxx            ghcr.io/yayasan-bina-insan-mustaqbal/tb40-fe/frontend:main ...
```

---

## Troubleshooting

### ❌ "Secret not found"

**Cause:** Secret name typo or not saved

**Fix:**
1. Go back to **Settings** → **Secrets and variables** → **Actions**
2. Verify exact names match:
   - `PRODUCTION_SERVER_HOST` (not `SERVER_HOST`)
   - `PRODUCTION_SERVER_USER` (not `SERVER_USER`)
   - `PRODUCTION_SERVER_PASSWORD` (not `SERVER_PASS`)
3. Case-sensitive!

---

### ❌ "Permission denied (publickey,password)"

**Cause:** Wrong password or username

**Fix:**
1. Delete `PRODUCTION_SERVER_PASSWORD` secret
2. Re-add with correct password: `cemara153`
3. Delete `PRODUCTION_SERVER_USER` secret
4. Re-add with correct username: `root`

---

### ❌ "Could not resolve host"

**Cause:** Wrong IP address

**Fix:**
1. Verify server IP: `ping 100.105.129.19`
2. If wrong, delete `PRODUCTION_SERVER_HOST`
3. Re-add with correct IP

---

### ❌ "docker: command not found"

**Cause:** Docker not installed on server

**Fix:**
```bash
ssh root@100.105.129.19

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
```

---

## Next Steps After Setup

1. ✅ Test deployment completes successfully
2. ✅ Verify website loads: https://tb40.insanmustaqbal.or.id/
3. ✅ Check logs: https://github.com/Yayasan-Bina-Insan-Mustaqbal/tb40-fe/actions
4. 📚 Read full guide: [DEPLOYMENT_GHCR.md](./DEPLOYMENT_GHCR.md)
5. 🔒 Optional: Set up SSH keys for better security

---

## Security Notes

⚠️ **Current setup uses password authentication**

**Recommended upgrade:** Use SSH keys instead

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@100.105.129.19

# Update GitHub secret
# PRODUCTION_SERVER_PASSWORD -> PRODUCTION_SERVER_KEY
# Paste contents of ~/.ssh/id_ed25519 (private key)

# Update workflow to use key instead of password
```

---

## Quick Reference

| What | Where | Link |
|------|-------|------|
| Add secrets | Repository Settings | https://github.com/Yayasan-Bina-Insan-Mustaqbal/tb40-fe/settings/secrets/actions |
| View workflows | Actions tab | https://github.com/Yayasan-Bina-Insan-Mustaqbal/tb40-fe/actions |
| Manual trigger | Deploy workflow | https://github.com/Yayasan-Bina-Insan-Mustaqbal/tb40-fe/actions/workflows/deploy-production.yml |
| View images | Packages | https://github.com/orgs/Yayasan-Bina-Insan-Mustaqbal/packages |

---

**Setup time:** ~5 minutes  
**First deployment:** ~2 minutes  
**Future deployments:** Automatic on `git push`
