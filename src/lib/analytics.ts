import { createServerFn } from '@tanstack/react-start'

const ANALYTICS_API_URL = 'http://tb40-analytics:5000'

type User = {
  id: number
  session_id: string
  name: string | null
  age: number | null
  test_mode: string | null
  started_at: string
  completed_at: string | null
  is_complete: number
  answers_count: number
  has_result: number | null
}

type Stats = {
  total_users: number
  completed_users: number
  partial_users: number
  avg_completion_minutes: number | null
}

type AnalyticsResponse = {
  success: boolean
  users: User[]
  stats: Stats
  error?: string
}

export const getAnalyticsData = createServerFn({ method: 'GET' }).handler(async (): Promise<AnalyticsResponse> => {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/api/analytics`)
    if (!response.ok) {
      throw new Error(`Analytics API returned ${response.status}`)
    }
    const data = await response.json()
    return data as AnalyticsResponse
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return {
      success: false,
      users: [],
      stats: {
        total_users: 0,
        completed_users: 0,
        partial_users: 0,
        avg_completion_minutes: null,
      },
      error: 'Failed to fetch analytics data',
    }
  }
})
