# Deployment & Runtime Analysis: Vite + TanStack Start (`srvx`) in Docker

This document recaps the technical challenges and findings discovered during the deployment of the Vite-based TanStack Start application using the `srvx` runner.

---

## 1. The Static Asset Serving Trap (`srvx` Relative Path Resolution)

### The Symptom
When the container was deployed, all HTML pages loaded successfully but assets (CSS/JS files under `/assets/`) returned `404 Not Found`.

### The Root Cause
1. In `srvx`, when serving static files alongside a server entry (`--entry`), it resolves the static files path (defaulting to `public`) **relative to the directory of the loaded entry file**.
2. Because the entry is located at `./dist/server/server.js` (inside a subdirectory), `srvx` resolved `--static ./public` relative to `./dist/server/`, attempting to load static files from `./dist/server/public/`, which did not exist.
3. This caused `srvx` to print `Static files: (create public/ dir)` and fail to serve any assets.

### The Fix Applied
We configured the start command to use the **absolute path** `/app/public` for the static directory:
```json
"start": "srvx serve --entry ./dist/server/server.js --static /app/public --prod"
```
This forces `srvx` to resolve to the absolute folder `/app/public` regardless of the entry location, resolving `404` errors for all static assets.

---

## 2. The Native Module Build Trap (`pnpm` v10 + Alpine Node)

### The Symptom
Database interactions crashed at runtime with `Error: Could not locate the bindings file` for `better-sqlite3` and `bcrypt`.

### The Root Cause
1. **pnpm v10 Security Defaults**: Since `pnpm` v10, build scripts (which compile native C++ add-ons) are ignored by default unless they are explicitly authorized using `pnpm.onlyBuiltDependencies` in `package.json`.
2. **Missing Compilers in Alpine**: The `node:20-alpine` base image does not contain C/C++ compilation tools (`g++`, `make`, `python3`) by default, preventing native compilation.

### The Fix Applied
1. Authorized native building in `package.json`:
   ```json
   "pnpm": {
     "onlyBuiltDependencies": [
       "better-sqlite3",
       "bcrypt"
     ]
   }
   ```
2. Installed build tools in the builder stage of the `Dockerfile`:
   ```dockerfile
   RUN apk add --no-cache python3 make g++ && npm install -g pnpm
   ```

---

## 3. Database Volume Persistence Trap

### The Symptom
The SQLite database was not persisting across container rebuilds because the database path was hardcoded relative to the runtime directory (`process.cwd()`), bypassing the Docker volume mount.

### The Fix Applied
We modified `src/lib/db.server.ts` to respect `process.env.DATA_DIR` if provided:
```ts
const dbDir = process.env.DATA_DIR || process.cwd();
const DB_PATH = path.resolve(dbDir, 'analytics.db');
```
This aligns the app with the Docker volume configuration:
```bash
docker run -e DATA_DIR=/app/data -v /root/projects/tb40-data:/app/data ...
```
