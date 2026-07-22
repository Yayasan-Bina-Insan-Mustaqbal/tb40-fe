import { createServerFn } from '@tanstack/react-start'
import { createOrg, createOrUpdateSession, updateSessionAnswers, updateSessionResults, getSessionById, getSessionsByOrg, getOrgByName, getAllOrgs, getAllSessions, createAdminToken, getAdminToken, deleteAdminToken, createOrgWithPassword } from './db.server'
import crypto from 'node:crypto'

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function comparePassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'))
  } catch (e) {
    return false
  }
}

export const getOrgs = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const orgs = getAllOrgs()
      return { success: true, orgs }
    } catch (error) {
      return { success: false, orgs: [] as { id: number; name: string }[], error: String(error) }
    }
  })

export const registerOrg = createServerFn({ method: 'POST' })
  .validator((data: { name: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const existing = getOrgByName(data.name)
      if (existing) {
        return { success: false, error: 'Nama organisasi sudah terdaftar.' }
      }
      const hash = hashPassword(data.password)
      const result = createOrgWithPassword(data.name.trim(), hash)
      return result
    } catch (error) {
      console.error('Failed to register org:', error)
      return { success: false, error: String(error) }
    }
  })

export const saveUser = createServerFn({ method: 'POST' })
  .validator((data: { sessionId: string; name?: string; nickName?: string; age?: number; testMode: string; orgName?: string }) => data)
  .handler(async ({ data }) => {
    try {
      let orgId = null
      if (data.orgName && data.orgName.trim() !== '') {
        const org = createOrg(data.orgName.trim())
        if (org) {
          orgId = org.id
        }
      }

      createOrUpdateSession({
        sessionId: data.sessionId,
        orgId: orgId,
        name: data.name,
        nickName: data.nickName,
        age: data.age,
        testMode: data.testMode
      })

      return { success: true, userId: data.sessionId }
    } catch (error) {
      console.error('Failed to save user:', error)
      return { success: false, error: String(error) }
    }
  })

export const saveAnswer = createServerFn({ method: 'POST' })
  .validator((data: { sessionId: string; userId: string; questionId: number; answerValue: number }) => data)
  .handler(async ({ data }) => {
    try {
      const session = getSessionById(data.sessionId)
      if (!session) throw new Error('Session not found')
      
      let answers = {}
      if (session.answers) {
        try { answers = JSON.parse(session.answers) } catch (e) {}
      }
      
      // @ts-ignore
      answers[data.questionId] = data.answerValue
      
      updateSessionAnswers(data.sessionId, answers)

      return { success: true }
    } catch (error) {
      console.error('Failed to save answer:', error)
      return { success: false, error: String(error) }
    }
  })

export const saveTierAnswers = createServerFn({ method: 'POST' })
  .validator((data: { sessionId: string; answers: any }) => data)
  .handler(async ({ data }) => {
    try {
      const session = getSessionById(data.sessionId)
      if (!session) throw new Error('Session not found')
      updateSessionAnswers(data.sessionId, data.answers)
      return { success: true }
    } catch (error) {
      console.error('Failed to save tier answers:', error)
      return { success: false, error: String(error) }
    }
  })

export const saveResult = createServerFn({ method: 'POST' })
  .validator((data: {
    sessionId: string
    userId: string
    rawScores: Record<string, number>
    percentileScores: Record<string, number>
    resultData: Record<string, unknown>
  }) => data)
  .handler(async ({ data }) => {
    try {
      updateSessionResults(data.sessionId, data.resultData)
      return { success: true }
    } catch (error) {
      console.error('Failed to save result:', error)
      return { success: false, error: String(error) }
    }
  })

export const getUserData = createServerFn({ method: 'GET' })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    try {
      const session = getSessionById(sessionId)
      if (!session) {
        return { success: false, error: 'Not found' }
      }
      let answers = {}
      if (session.answers) {
        try { answers = JSON.parse(session.answers) } catch (e) {}
      }
      let results = null
      if (session.raw_scores) {
        try { results = JSON.parse(session.raw_scores) } catch (e) {}
      }
      return { success: true, session: { ...session, parsedAnswers: answers, parsedResults: results } }
    } catch (error) {
      console.error('Failed to get user data:', error)
      return { success: false, error: String(error) }
    }
  })

export const adminLogin = createServerFn({ method: 'POST' })
  .validator((data: { orgName: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const org = getOrgByName(data.orgName)
      if (!org) {
        return { success: false, error: 'Organization not found' }
      }
      if (!org.password_hash) {
        if (data.password !== 'admin') {
          return { success: false, error: 'Organization has no password set. Gunakan sandi bawaan "admin"' }
        }
        const token = createAdminToken(org.id)
        return { success: true, token }
      }

      const match = comparePassword(data.password, org.password_hash)
      if (!match) {
        return { success: false, error: 'Invalid password' }
      }

      const token = createAdminToken(org.id)
      return { success: true, token }
    } catch (error) {
      console.error('Failed admin login:', error)
      return { success: false, error: String(error) }
    }
  })

export const getAdminSessions = createServerFn({ method: 'GET' })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    try {
      const adminSession = getAdminToken(token)
      if (!adminSession) {
        return { success: false, error: 'Invalid or expired session. Please log in again.' }
      }
      const { org_id: orgId } = adminSession
      const sessions = orgId === 0 ? getAllSessions() : getSessionsByOrg(orgId)
      return { success: true, sessions }
    } catch (error) {
      console.error('Failed to get admin sessions:', error)
      return { success: false, error: String(error) }
    }
  })

export const adminLogout = createServerFn({ method: 'POST' })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    try {
      deleteAdminToken(token)
      return { success: true }
    } catch (error) {
      console.error('Failed admin logout:', error)
      return { success: false, error: String(error) }
    }
  })
