import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const DB_PATH = path.resolve(process.cwd(), 'analytics.db')

export const db = new Database(DB_PATH)

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS orgs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    password_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS test_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER,
    session_id TEXT UNIQUE NOT NULL,
    name TEXT,
    nick_name TEXT,
    age INTEGER,
    test_mode TEXT,
    raw_scores TEXT, -- JSON string
    answers TEXT, -- JSON string of intermediate answers
    status TEXT NOT NULL DEFAULT 'STARTED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(org_id) REFERENCES orgs(id)
  );

  CREATE TABLE IF NOT EXISTS admin_tokens (
    token TEXT PRIMARY KEY,
    org_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL -- Unix timestamp (seconds)
  );
`)

// Helper functions for Orgs
export const getOrgByName = (name: string) => {
  return db.prepare('SELECT * FROM orgs WHERE name = ? COLLATE NOCASE').get(name.toLowerCase()) as { id: number, name: string, password_hash: string | null } | undefined
}

export const getAllOrgs = () => {
  return db.prepare('SELECT id, name FROM orgs ORDER BY name ASC').all() as { id: number; name: string }[]
}

export const createOrg = (name: string) => {
  const result = db.prepare('INSERT OR IGNORE INTO orgs (name) VALUES (?)').run(name.toLowerCase())
  return getOrgByName(name)
}

export const createOrgWithPassword = (name: string, passwordHash: string) => {
  try {
    db.prepare('INSERT INTO orgs (name, password_hash) VALUES (?, ?)').run(name.toLowerCase(), passwordHash)
    return { success: true }
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return { success: false, error: 'Nama organisasi sudah terdaftar.' }
    }
    return { success: false, error: String(e) }
  }
}

// Helper functions for Sessions
export const createOrUpdateSession = (data: {
  sessionId: string,
  orgId: number | null,
  name?: string,
  nickName?: string,
  age?: number,
  testMode?: string
}) => {
  const existing = db.prepare('SELECT id FROM test_sessions WHERE session_id = ?').get(data.sessionId)
  if (existing) {
    db.prepare(`
      UPDATE test_sessions 
      SET org_id = COALESCE(?, org_id),
          name = COALESCE(?, name),
          nick_name = COALESCE(?, nick_name),
          age = COALESCE(?, age),
          test_mode = COALESCE(?, test_mode),
          updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `).run(data.orgId, data.name, data.nickName, data.age, data.testMode, data.sessionId)
  } else {
    db.prepare(`
      INSERT INTO test_sessions (session_id, org_id, name, nick_name, age, test_mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.sessionId, data.orgId, data.name, data.nickName, data.age, data.testMode)
  }
}

export const updateSessionResults = (sessionId: string, rawScores: any) => {
  db.prepare(`
    UPDATE test_sessions
    SET raw_scores = ?, status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `).run(JSON.stringify(rawScores), sessionId)
}

export const updateSessionAnswers = (sessionId: string, answers: any) => {
  db.prepare(`
    UPDATE test_sessions
    SET answers = ?, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `).run(JSON.stringify(answers), sessionId)
}

export const getSessionById = (sessionId: string) => {
  return db.prepare('SELECT * FROM test_sessions WHERE session_id = ?').get(sessionId) as any
}

export const getSessionsByOrg = (orgId: number) => {
  return db.prepare('SELECT * FROM test_sessions WHERE org_id = ? ORDER BY created_at DESC').all(orgId) as any[]
}

export const getAllSessions = () => {
  return db.prepare('SELECT * FROM test_sessions ORDER BY created_at DESC').all() as any[]
}

// ---------------------------------------------------------------------------
// Admin token helpers
// ---------------------------------------------------------------------------

const TOKEN_TTL_SECONDS = 60 * 60 * 8 // 8 hours

export const createAdminToken = (orgId: number): string => {
  const token = crypto.randomUUID()
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  db.prepare('INSERT INTO admin_tokens (token, org_id, expires_at) VALUES (?, ?, ?)').run(token, orgId, expiresAt)
  return token
}

export const getAdminToken = (token: string): { token: string; org_id: number; expires_at: number } | null => {
  const now = Math.floor(Date.now() / 1000)
  // Delete expired tokens opportunistically
  db.prepare('DELETE FROM admin_tokens WHERE expires_at < ?').run(now)
  return db.prepare('SELECT * FROM admin_tokens WHERE token = ?').get(token) as { token: string; org_id: number; expires_at: number } | null
}

export const deleteAdminToken = (token: string): void => {
  db.prepare('DELETE FROM admin_tokens WHERE token = ?').run(token)
}
