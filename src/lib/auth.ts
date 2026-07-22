export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('isLoggedIn') === 'true'
}

export function login() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('isLoggedIn', 'true')
}

export function logout() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('isLoggedIn')
}

// ---------------------------------------------------------------------------
// Admin token helpers (stored in sessionStorage — cleared on tab/window close)
// ---------------------------------------------------------------------------

const ADMIN_TOKEN_KEY = 'adminToken'
const ADMIN_ORG_NAME_KEY = 'adminOrgName'

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string, orgName: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  sessionStorage.setItem(ADMIN_ORG_NAME_KEY, orgName)
}

export function getAdminOrgName(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ADMIN_ORG_NAME_KEY)
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ORG_NAME_KEY)
}
