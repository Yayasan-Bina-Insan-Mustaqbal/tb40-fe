import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'

const ANALYTICS_API_URL = 'http://localhost:5000'

export const APIRoute = createAPIFileRoute('/api/analytics')({  
  GET: async ({ request }) => {
    try {
      const response = await fetch(`${ANALYTICS_API_URL}/api/analytics`)
      const data = await response.json()
      return json(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      return json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 })
    }
  },
})
