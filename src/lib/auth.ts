export function isAuthenticated(): boolean {
  return sessionStorage.getItem('isLoggedIn') === 'true'
}

export function login() {
  sessionStorage.setItem('isLoggedIn', 'true')
}

export function logout() {
  sessionStorage.removeItem('isLoggedIn')
}
