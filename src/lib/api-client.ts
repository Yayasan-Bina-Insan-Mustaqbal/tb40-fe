/**
 * API client for API TB40 (v0.3 Adaptive Assessment & Persistence Engine)
 */

const API_BASE_URL = typeof window === 'undefined'
  ? process.env.VITE_API_URL || 'http://localhost:4040'
  : import.meta.env.VITE_API_URL || 'http://localhost:4040'

export interface SubmissionPayload {
  is_anonymous?: boolean
  type?: 'tb40' | 'tb40anak'
  subject_name?: string
  birth_date?: string
  age?: number
  is_observer?: boolean
  event_id?: string
  org_id?: string
}

export interface ProfileUpdatePayload {
  subject_name: string
  birth_date?: string
  age?: number
  is_observer?: boolean
}

export interface ContactUpdatePayload {
  email?: string
  phone?: string
}

export interface EvaluatePayload {
  sequence_number?: number
  answers?: Record<string, any>
  request_precision?: boolean
  is_anonymous?: boolean
}

/**
 * Initialize a new submission session (Anonymous or Profiled)
 */
export async function createSubmission(payload: SubmissionPayload = { is_anonymous: true }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v0.3/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (error) {
    console.error('Failed to create submission:', error)
    return { success: false, error: 'Network connection failed' }
  }
}

/**
 * Fetch a submission state by ID
 */
export async function getSubmission(submissionId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v0.3/submissions/${encodeURIComponent(submissionId)}`)
    return await res.json()
  } catch (error) {
    console.error(`Failed to fetch submission ${submissionId}:`, error)
    return { success: false, error: 'Network connection failed' }
  }
}

/**
 * Debounced step evaluation & auto-save
 */
export async function evaluateStep(submissionId: string, payload: EvaluatePayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v0.3/submissions/${encodeURIComponent(submissionId)}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (error) {
    console.error(`Failed to evaluate step for ${submissionId}:`, error)
    return { success: false, error: 'Network connection failed' }
  }
}

/**
 * Update profile details (Unlocking Tier 3)
 */
export async function updateProfile(submissionId: string, payload: ProfileUpdatePayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v0.3/submissions/${encodeURIComponent(submissionId)}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (error) {
    console.error(`Failed to update profile for ${submissionId}:`, error)
    return { success: false, error: 'Network connection failed' }
  }
}

/**
 * Post-report contact info enrichment
 */
export async function updateContact(submissionId: string, payload: ContactUpdatePayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v0.3/submissions/${encodeURIComponent(submissionId)}/contact`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (error) {
    console.error(`Failed to update contact for ${submissionId}:`, error)
    return { success: false, error: 'Network connection failed' }
  }
}

/**
 * Fetch public share result payload
 */
export async function getShareResult(submissionId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v0.3/submissions/${encodeURIComponent(submissionId)}/share`)
    return await res.json()
  } catch (error) {
    console.error(`Failed to fetch share result for ${submissionId}:`, error)
    return { success: false, error: 'Network connection failed' }
  }
}

/**
 * Fetch dynamic question schema for assessment version
 */
export async function getSchema(type: 'tb40' | 'tb40anak' = 'tb40', isObserver: boolean = false, subjectName: string = '') {
  try {
    const url = new URL(`${API_BASE_URL}/api/v0.3/${type}/schema`)
    if (isObserver) url.searchParams.set('is_observer', 'true')
    if (subjectName) url.searchParams.set('subject_name', subjectName)

    const res = await fetch(url.toString())
    return await res.json()
  } catch (error) {
    console.error(`Failed to fetch schema for ${type}:`, error)
    return { success: false, error: 'Network connection failed' }
  }
}

/**
 * Event admin batch export of all submissions for an event
 */
export async function getEventSubmissions(eventId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v0.3/events/${encodeURIComponent(eventId)}/submissions`)
    return await res.json()
  } catch (error) {
    console.error(`Failed to fetch submissions for event ${eventId}:`, error)
    return { success: false, error: 'Network connection failed' }
  }
}
