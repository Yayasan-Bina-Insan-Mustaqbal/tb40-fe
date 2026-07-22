// Session management for test analytics

export interface TestSession {
  id: string
  userId: number | null
  startedAt: number
}

const SESSION_KEY = 'tb40_session'

export function createSession(): TestSession {
  const session: TestSession = {
    id: crypto.randomUUID(),
    userId: null,
    startedAt: Date.now(),
  }
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
  
  return session
}

export function getSession(): TestSession | null {
  if (typeof window === 'undefined') return null
  
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function updateSession(updates: Partial<TestSession>): void {
  if (typeof window === 'undefined') return
  
  const current = getSession()
  if (!current) return
  
  const updated = { ...current, ...updates }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
}
