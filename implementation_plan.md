# Refactoring, Security Hardening & TanStack Form Integration Plan

This plan addresses the audited codebase issues in `tb40-fe` alongside the migration to **TanStack Form** (`@tanstack/react-form`).

---

## User Review Required

> [!IMPORTANT]
> - **Security Hardening**: The default fallback password `"admin"` for passwordless organizations in `src/lib/analytics.ts` will be removed. Passwords will now be hashed securely using `bcrypt` instead of weak 1,000-iteration PBKDF2.
> - **TypeScript Alignment**: `userId` types across `session.ts`, `analytics.ts`, and `test.tsx` will be standardized to resolve all 16 build type errors.
> - **Form Migration**: `@tanstack/react-form` will be integrated with Zod validation schemas across `index.tsx`, `admin.index.tsx`, `admin.register.tsx`, and `login-form.tsx`.
> - **SQLite Handle Protection**: Database instantiation in `db.server.ts` will use global singleton caching to prevent connection leaks during Vite hot-reloading (HMR).

---

## Open Questions

1. **Password Migration for Existing Orgs**: Are there any existing organizations in `analytics.db` created without passwords that require password initialization, or should all admin logins require valid `bcrypt` hashed passwords moving forward?

---

## Proposed Changes

### Component 1: Security & Database Hardening

#### [MODIFY] [db.server.ts](file:///home/abuhafi/Project/tb40-fe/src/lib/db.server.ts)
- Use `globalThis` singleton for `better-sqlite3` instance to prevent duplicate connections during Vite HMR reloads.
- Remove unused `fs` import and cleanup unreferenced `result` variable.

#### [MODIFY] [analytics.ts](file:///home/abuhafi/Project/tb40-fe/src/lib/analytics.ts)
- Replace weak PBKDF2 hash function with `bcrypt.hashSync` and `bcrypt.compareSync`.
- Remove the unsafe `password !== 'admin'` fallback in `adminLogin`.
- Standardize `userId` parameter types in validators and handlers to `string`.

---

### Component 2: Type Safety & Component Fixes

#### [MODIFY] [session.ts](file:///home/abuhafi/Project/tb40-fe/src/lib/session.ts)
- Change `userId: number | null` to `userId: string | null` in `TestSession` interface to match `sessionId` across the system.

#### [MODIFY] [test.tsx](file:///home/abuhafi/Project/tb40-fe/src/routes/test.tsx)
- Resolve `userId` type mismatches in `saveUser`, `saveAnswer`, and `saveResult` calls.

#### [MODIFY] [login-form.tsx](file:///home/abuhafi/Project/tb40-fe/src/components/login-form.tsx)
- Fix routing error (`/dashboard` route does not exist -> update or route to `/admin`).
- Refactor login handling to use `useForm` from `@tanstack/react-form`.

#### [MODIFY] Unused Imports Cleanup
- Clean up unused imports in [site-header.tsx](file:///home/abuhafi/Project/tb40-fe/src/components/site-header.tsx), [nav-main.tsx](file:///home/abuhafi/Project/tb40-fe/src/components/nav-main.tsx), [nav-user.tsx](file:///home/abuhafi/Project/tb40-fe/src/components/nav-user.tsx), [org-combobox.tsx](file:///home/abuhafi/Project/tb40-fe/src/components/org-combobox.tsx), [index.tsx](file:///home/abuhafi/Project/tb40-fe/src/routes/index.tsx), and test spec files.

---

### Component 3: TanStack Form Integration

#### [NEW] [schemas.ts](file:///home/abuhafi/Project/tb40-fe/src/lib/schemas.ts)
- Define reusable Zod validation schemas:
  - `startTestSchema` (`fullName`, `nickName`, `age`, `orgName`, `testMode`)
  - `adminLoginSchema` (`orgName`, `password`)
  - `adminRegisterSchema` (`name`, `password`, `confirmPassword`)
  - `loginSchema` (`password`)

#### [MODIFY] [admin.register.tsx](file:///home/abuhafi/Project/tb40-fe/src/routes/admin.register.tsx)
- Refactor registration form using `useForm` from `@tanstack/react-form` with `adminRegisterSchema`.

#### [MODIFY] [admin.index.tsx](file:///home/abuhafi/Project/tb40-fe/src/routes/admin.index.tsx)
- Refactor admin login form using `useForm` with `adminLoginSchema`.

#### [MODIFY] [index.tsx](file:///home/abuhafi/Project/tb40-fe/src/routes/index.tsx)
- Refactor test wizard setup form using `useForm` with `startTestSchema`.

---

## Verification Plan

### Automated Verification
1. **Type Checking**:
   ```bash
   npm run typecheck
   ```
   *Expected result: 0 errors (all 16 current TypeScript errors resolved).*
2. **Linting & Formatting**:
   ```bash
   npm run lint
   ```
3. **Automated Unit & Playwright Tests**:
   ```bash
   npm run test
   ```

### Manual Verification
1. Test organization registration at `/admin/register`.
2. Test admin login with `bcrypt` hashed password at `/admin`.
3. Verify default password `"admin"` is rejected for unhashed accounts.
4. Test test wizard setup form at `/` with nickname auto-suggestions and validation.
