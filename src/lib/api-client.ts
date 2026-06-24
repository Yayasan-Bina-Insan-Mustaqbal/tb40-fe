/**
 * API client for analytics database operations
 */

const API_BASE_URL = import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:5000'

export type SaveUserData = {
  sessionId: string
  name?: string
  age?: number
  testMode?: 'adaptive' | 'precision'
}

export type SaveAnswerData = {
  sessionId: string
  userId?: number
  questionId: number
  answerValue: number
}

export type SaveResultData = {
  sessionId: string
  userId: number
  rawScores: Record<string, number>
  percentileScores: Record<string, number>
  resultData: unknown
}

export async function saveUser(data: SaveUserData): Promise<{ success: boolean; userId?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveUser', ...data }),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to save user:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function saveAnswer(data: SaveAnswerData): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveAnswer', ...data }),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to save answer:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function saveResult(data: SaveResultData): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveResult', ...data }),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to save result:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function getUserData(sessionId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user?sessionId=${encodeURIComponent(sessionId)}`)
    return await response.json()
  } catch (error) {
    console.error('Failed to get user data:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function getAnalytics() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics`)
    return await response.json()
  } catch (error) {
    console.error('Failed to get analytics:', error)
    return { success: false, error: 'Network error' }
  }
}
