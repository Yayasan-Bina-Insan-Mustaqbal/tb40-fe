import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'

const ANALYTICS_API_URL = 'http://localhost:5000'

export const APIRoute = createAPIFileRoute('/api/user')({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('sessionId')
      
      const response = await fetch(`${ANALYTICS_API_URL}/api/user?sessionId=${sessionId}`)
      const data = await response.json()
      return json(data)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      return json({ success: false, error: 'Failed to fetch user data' }, { status: 500 })
    }
  },
  
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      
      const response = await fetch(`${ANALYTICS_API_URL}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await response.json()
      return json(data)
    } catch (error) {
      console.error('Failed to save user data:', error)
      return json({ success: false, error: 'Failed to save user data' }, { status: 500 })
    }
  },
})
