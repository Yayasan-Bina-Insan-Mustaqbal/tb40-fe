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
