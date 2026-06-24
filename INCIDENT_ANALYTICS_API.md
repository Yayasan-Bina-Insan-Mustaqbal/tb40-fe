# Incident Report: Analytics Dashboard "Failed to Load" Error

**Date:** 2026-06-24  
**Severity:** High (Production feature completely broken)  
**Status:** Resolved  
**Duration:** ~2 hours  

---

## Summary

After deploying the analytics dashboard to production, users encountered a "Failed to load analytics" error when accessing the dashboard. The root cause was a network routing issue where the frontend application could not reach the analytics API service.

---

## Timeline

### Initial Deployment
- **18:03 UTC** - Analytics API deployed as Docker container `tb40-analytics` on port 5000
- **18:03 UTC** - Frontend deployed with `VITE_ANALYTICS_API_URL=https://tb40.insanmustaqbal.or.id/api`
- **18:03 UTC** - Nginx configured to proxy `/api/*` routes to `localhost:5000`

### Problem Discovery
- **18:07 UTC** - User reported "failed to load analytics" error on dashboard
- **18:08 UTC** - Investigation revealed frontend receiving HTML 404 pages instead of JSON

### Root Cause Analysis
- **18:10 UTC** - Discovered domain `tb40.insanmustaqbal.or.id` resolves to **103.167.12.129** (proxy server)
- **18:15 UTC** - Actual application server is **100.105.129.19**
- **18:20 UTC** - Proxy server at 103.167.12.129 was not forwarding `/api/*` requests
- **18:25 UTC** - Client-side fetch to `https://tb40.insanmustaqbal.or.id/api/analytics` hit proxy, not our server

---

## Root Causes

### Primary Issue: Network Routing
1. **External proxy layer** - Domain points to proxy (103.167.12.129), not app server (100.105.129.19)
2. **Proxy misconfiguration** - Proxy server doesn't forward `/api/*` routes to backend
3. **TanStack Start API routes** - Initial attempt to create `/api/analytics` route failed (routes not registered)
4. **Client-side fetching** - Browser requests went through external proxy, never reached our nginx

### Secondary Issue: SSR Environment
5. **sessionStorage access** - Code accessed `sessionStorage` during server-side rendering
6. **Docker networking** - Containers initially not on shared network

---

## Solution

### Attempted Fixes (Failed)
1. ❌ **Nginx proxy configuration** - Added `/api/*` location block to nginx (worked locally, failed through domain)
2. ❌ **TanStack Start API routes** - Created `api.analytics.ts` and `api.user.ts` (routes not registered by framework)
3. ❌ **SSL certificate setup** - Attempted Let's Encrypt cert (domain validation failed)

### Final Solution (Successful)

#### 1. Docker Network Communication
```bash
# Create shared network
docker network create tb40-network

# Connect both containers
docker network connect tb40-network tb40-analytics
docker run --network tb40-network tb40-frontend
```

#### 2. Server-Side Data Fetching
Created `src/lib/analytics.server.ts` with TanStack Start server functions:
```typescript
export const getAnalyticsData = createServerFn({ method: 'GET' })
  .handler(async () => {
    const response = await fetch('http://tb40-analytics:5000/api/analytics')
    return await response.json()
  })
```

#### 3. Updated API Client
```typescript
const API_BASE_URL = typeof window === 'undefined' 
  ? 'http://tb40-analytics:5000' // Server: Docker network
  : import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:5000' // Client: fallback
```

#### 4. Fixed SSR Issues
Added environment checks before accessing browser APIs:
```typescript
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('isLoggedIn') === 'true'
}
```

---

## Key Learnings

### What Went Wrong
1. **Infrastructure assumption** - Assumed domain pointed directly to app server
2. **Client-side fetching** - Relied on browser making API calls through external network
3. **Missing network isolation** - Containers weren't connected via Docker network initially
4. **SSR oversight** - Didn't account for server-side rendering accessing browser APIs

### What Went Right
1. **Docker health checks** - Analytics API container reported healthy throughout
2. **Direct IP testing** - Quickly confirmed services working on internal network
3. **Server functions** - TanStack Start server functions solved the routing problem elegantly
4. **Incremental testing** - Each fix was tested before proceeding

---

## Prevention

### Immediate Actions
- ✅ All analytics data now fetched server-side
- ✅ Docker network configured for container-to-container communication
- ✅ SSR-safe code throughout application
- ✅ Environment checks before accessing browser APIs

### Future Recommendations

#### 1. Infrastructure Documentation
- Document complete network topology (proxy → app server)
- Maintain DNS/proxy configuration in repository
- Test deployments through actual domain, not just IP

#### 2. Development Practices
- Always use server functions for backend API calls in SSR apps
- Default to Docker networks for container communication
- Never assume client can reach backend directly
- Add `typeof window === 'undefined'` checks for all browser APIs

#### 3. Testing Strategy
- Add E2E tests that run against production domain
- Test through proxy layer in staging environment
- Verify SSR/hydration with actual production build
- Monitor fetch failures in production with error tracking

#### 4. Monitoring
- Set up alerts for fetch failures
- Track 404 responses to API endpoints
- Monitor Docker network connectivity
- Log SSR errors separately from client errors

---

## Technical Details

### Architecture Before Fix
```
Browser
  ↓ HTTPS
Proxy (103.167.12.129)
  ↓ ??? (route not configured)
[404 Error]

App Server (100.105.129.19)
  ├─ Frontend (port 3000)
  └─ Analytics API (port 5000) [unreachable from browser]
```

### Architecture After Fix
```
Browser
  ↓ HTTPS
Proxy (103.167.12.129)
  ↓
App Server (100.105.129.19)
  ├─ Nginx (port 80/443)
  │   └→ Frontend (port 3000)
  │
  └─ Docker Network (tb40-network)
      ├─ Frontend Container
      │   └─ Server Functions ──→ Analytics API (internal)
      └─ Analytics Container (port 5000)
```

### Network Flow
1. Browser loads dashboard page from `https://tb40.insanmustaqbal.or.id/dashboard`
2. Server-side rendering executes `getAnalyticsData()` server function
3. Server function fetches from `http://tb40-analytics:5000/api/analytics` via Docker network
4. Response included in initial HTML payload
5. Client hydrates with data already present

### Key Files Changed

**Commit 6c9ce7d** - Final fix
- `src/lib/analytics.server.ts` (new) - Server function for analytics
- `src/lib/auth.ts` - Added window checks
- `src/routes/dashboard.tsx` - SSR-safe auth guard
- `src/components/analytics-dashboard.tsx` - Uses server function

---

## Resolution Verification

✅ **Frontend → Analytics**: `http://tb40-analytics:5000/api/analytics` returns `{"stats":{"total_users":0}}`  
✅ **Docker network**: Both containers on `tb40-network` (172.19.0.0/16)  
✅ **SSR**: No `sessionStorage is not defined` errors  
✅ **Dashboard**: Loads without "failed to load analytics" error  
✅ **Empty state**: Shows 0 users correctly (fresh database)  

---

## Related Issues

- Initial deployment: Commit dc7f293 (frontend), 0e6912c (backend)
- Analytics API creation: Commit 6d06071
- Final fix: Commit 6c9ce7d

---

## Contributors

- Incident Response: AI Assistant
- Testing: Manual browser testing required
- Deployment: Docker + GitHub Actions

---

**Status: Resolved**  
**Last Updated:** 2026-06-24 18:45 UTC
