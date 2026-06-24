# Analytics Database Architecture

## Overview

The TB40 analytics system uses SQLite3 for persistent storage of test sessions, answers, and results. This document details the complete database schema, API endpoints, and data flow.

---

## Database Configuration

### Location & Setup

```bash
# Production
~/Project/tb40-analytics-api/data/tb40.db

# Development
./data/tb40.db
```

### SQLite Configuration

```javascript
const db = new Database('./data/tb40.db')

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL')

// Performance optimizations
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -64000') // 64MB cache
```

**Why WAL mode?**
- Allows concurrent reads while writing
- Better performance for web applications
- Automatic checkpoint management

---

## Schema Design

### 1. Users Table

Tracks each test session and user demographics.

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    name TEXT,
    age INTEGER,
    test_mode TEXT CHECK(test_mode IN ('adaptive', 'precision')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    is_complete INTEGER DEFAULT 0,
    has_result INTEGER DEFAULT 0
);

CREATE INDEX idx_session ON users(session_id);
CREATE INDEX idx_completed ON users(completed_at);
```

**Fields:**

| Field | Type | Purpose |
|-------|------|--------|
| `id` | INTEGER | Primary key, auto-increment |
| `session_id` | TEXT | UUID from `crypto.randomUUID()`, unique identifier |
| `name` | TEXT | User's name (optional) |
| `age` | INTEGER | User's age (optional) |
| `test_mode` | TEXT | `'adaptive'` or `'precision'` |
| `started_at` | DATETIME | When user began test (auto-set) |
| `completed_at` | DATETIME | When test was completed (NULL if incomplete) |
| `is_complete` | INTEGER | `1` if test completed, `0` otherwise |
| `has_result` | INTEGER | `1` if results calculated, `0` otherwise |

**Indexes:**
- `idx_session` - Fast lookup by session_id
- `idx_completed` - Efficient filtering by completion status

---

### 2. Test Answers Table

Stores individual question responses with auto-save support.

```sql
CREATE TABLE IF NOT EXISTS test_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    answer_value INTEGER NOT NULL,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, question_id)
);

CREATE INDEX idx_user_answers ON test_answers(user_id);
CREATE INDEX idx_session_answers ON test_answers(session_id);
```

**Fields:**

| Field | Type | Purpose |
|-------|------|--------|
| `id` | INTEGER | Primary key |
| `user_id` | INTEGER | Foreign key → users.id |
| `session_id` | TEXT | Redundant session tracking for recovery |
| `question_id` | INTEGER | Question number (1-40) |
| `answer_value` | INTEGER | Selected answer (typically 1-5) |
| `answered_at` | DATETIME | When answer was saved |

**Constraints:**
- `UNIQUE(user_id, question_id)` - One answer per question per user
- `FOREIGN KEY` with `CASCADE DELETE` - Remove answers when user deleted

**Indexes:**
- `idx_user_answers` - Fast retrieval of all user's answers
- `idx_session_answers` - Session-based answer lookup

**Auto-save behavior:**
- `INSERT OR REPLACE` allows updating existing answers
- Fire-and-forget from frontend (non-blocking)
- Enables test progress recovery

---

### 3. Test Results Table

Stores final calculated results as JSON.

```sql
CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    raw_scores TEXT NOT NULL,
    percentile_scores TEXT NOT NULL,
    result_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

CREATE INDEX idx_user_result ON test_results(user_id);
CREATE INDEX idx_session_result ON test_results(session_id);
```

**Fields:**

| Field | Type | Purpose |
|-------|------|--------|
| `id` | INTEGER | Primary key |
| `user_id` | INTEGER | Foreign key → users.id |
| `session_id` | TEXT | Session identifier |
| `raw_scores` | TEXT | JSON: `{"V": 85, "L": 72, ...}` |
| `percentile_scores` | TEXT | JSON: `{"V": 90, "L": 65, ...}` |
| `result_data` | TEXT | Full result JSON (interpretations, recommendations) |
| `created_at` | DATETIME | When results were calculated |

**Constraints:**
- `UNIQUE(user_id)` - One result per user
- `FOREIGN KEY` with `CASCADE DELETE`

**JSON Storage:**
```json
{
  "raw_scores": {
    "V": 85,
    "L": 72,
    "N": 90,
    "S": 78,
    "Q": 82,
    "M": 88,
    "K": 75
  },
  "percentile_scores": {
    "V": 90,
    "L": 65,
    ...
  },
  "result_data": {
    "profile": "Logical-Mathematical",
    "strengths": [...],
    "recommendations": [...]
  }
}
```

---

## API Endpoints

### Analytics Dashboard

**Endpoint:** `GET /api/analytics`

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "session_id": "019ef123-4567-8910-abcd-ef1234567890",
      "name": "John Doe",
      "age": 25,
      "test_mode": "adaptive",
      "started_at": "2026-06-24T10:00:00.000Z",
      "completed_at": "2026-06-24T10:15:00.000Z",
      "is_complete": 1,
      "answers_count": 40,
      "has_result": 1
    }
  ],
  "stats": {
    "total_users": 10,
    "completed_users": 8,
    "partial_users": 2,
    "avg_completion_minutes": 12.5
  }
}
```

**SQL Query:**
```sql
-- Get users with answer counts
SELECT 
  u.*,
  COUNT(ta.id) as answers_count
FROM users u
LEFT JOIN test_answers ta ON u.id = ta.user_id
GROUP BY u.id
ORDER BY u.started_at DESC;

-- Calculate stats
SELECT
  COUNT(*) as total_users,
  SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as completed_users,
  SUM(CASE WHEN is_complete = 0 THEN 1 ELSE 0 END) as partial_users,
  AVG(CASE 
    WHEN completed_at IS NOT NULL 
    THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60 
  END) as avg_completion_minutes
FROM users;
```

---

### User Operations

**Endpoint:** `POST /api/user`

#### 1. Save User (Start Session)

**Request:**
```json
{
  "action": "saveUser",
  "sessionId": "019ef123-4567-8910-abcd-ef1234567890",
  "name": "John Doe",
  "age": 25,
  "testMode": "adaptive"
}
```

**Response:**
```json
{
  "success": true,
  "userId": 1
}
```

**SQL:**
```sql
INSERT INTO users (session_id, name, age, test_mode)
VALUES (?, ?, ?, ?);
```

---

#### 2. Save Answer (Auto-save)

**Request:**
```json
{
  "action": "saveAnswer",
  "sessionId": "019ef123-4567-8910-abcd-ef1234567890",
  "userId": 1,
  "questionId": 5,
  "answerValue": 3
}
```

**Response:**
```json
{
  "success": true
}
```

**SQL:**
```sql
INSERT OR REPLACE INTO test_answers 
  (user_id, session_id, question_id, answer_value)
VALUES (?, ?, ?, ?);
```

**Frontend behavior:**
```javascript
// Fire-and-forget (async, non-blocking)
await saveAnswer({
  sessionId: session.id,
  userId: session.userId,
  questionId: currentQuestion,
  answerValue: selectedAnswer
})
// UI continues immediately, doesn't wait for response
```

---

#### 3. Save Result (Final)

**Request:**
```json
{
  "action": "saveResult",
  "sessionId": "019ef123-4567-8910-abcd-ef1234567890",
  "userId": 1,
  "rawScores": {"V": 85, "L": 72, "N": 90, "S": 78, "Q": 82, "M": 88, "K": 75},
  "percentileScores": {"V": 90, "L": 65, "N": 95, "S": 70, "Q": 85, "M": 92, "K": 68},
  "resultData": { /* full result object */ }
}
```

**Response:**
```json
{
  "success": true
}
```

**SQL:**
```sql
-- Insert result
INSERT INTO test_results 
  (user_id, session_id, raw_scores, percentile_scores, result_data)
VALUES (?, ?, ?, ?, ?);

-- Update user completion status
UPDATE users 
SET completed_at = CURRENT_TIMESTAMP,
    is_complete = 1,
    has_result = 1
WHERE id = ?;
```

---

#### 4. Get User Data

**Endpoint:** `GET /api/user?sessionId=<uuid>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "session_id": "019ef123-4567-8910-abcd-ef1234567890",
    "name": "John Doe",
    "age": 25,
    "test_mode": "adaptive",
    "started_at": "2026-06-24T10:00:00.000Z",
    "completed_at": "2026-06-24T10:15:00.000Z",
    "is_complete": 1
  },
  "answers": [
    {"question_id": 1, "answer_value": 4},
    {"question_id": 2, "answer_value": 3}
  ],
  "result": {
    "raw_scores": {"V": 85, ...},
    "percentile_scores": {"V": 90, ...},
    "result_data": {...}
  }
}
```

**SQL:**
```sql
-- Get user
SELECT * FROM users WHERE session_id = ?;

-- Get answers
SELECT question_id, answer_value 
FROM test_answers 
WHERE session_id = ?
ORDER BY question_id;

-- Get result
SELECT raw_scores, percentile_scores, result_data
FROM test_results
WHERE session_id = ?;
```

---

## Data Flow

### Complete Test Journey

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER STARTS TEST                                         │
└─────────────────────────────────────────────────────────────┘
   Frontend: Generate UUID → sessionStorage
   ↓
   POST /api/user (saveUser)
   ↓
   INSERT INTO users → userId
   ↓
   Frontend: Store userId in sessionStorage

┌─────────────────────────────────────────────────────────────┐
│ 2. USER ANSWERS QUESTIONS (Auto-save every answer)         │
└─────────────────────────────────────────────────────────────┘
   For each answer:
     POST /api/user (saveAnswer) [async, fire-and-forget]
     ↓
     INSERT OR REPLACE INTO test_answers
   
   UI never blocks, continues immediately

┌─────────────────────────────────────────────────────────────┐
│ 3. USER COMPLETES TEST                                      │
└─────────────────────────────────────────────────────────────┘
   Backend calculates scores
   ↓
   POST /api/user (saveResult)
   ↓
   BEGIN TRANSACTION
     INSERT INTO test_results
     UPDATE users SET completed_at, is_complete=1, has_result=1
   COMMIT
   ↓
   Redirect to /result?session=<uuid>

┌─────────────────────────────────────────────────────────────┐
│ 4. DASHBOARD LOADS ANALYTICS                                │
└─────────────────────────────────────────────────────────────┘
   GET /api/analytics
   ↓
   SELECT users + JOIN test_answers + aggregate stats
   ↓
   Return JSON with users[] and stats{}
   ↓
   Render table + stats cards
```

---

## Session Management

### Session ID Generation

```javascript
import { v4 as uuidv4 } from 'uuid'
// OR native:
const sessionId = crypto.randomUUID()
```

**Storage:**
```javascript
// Create session
const session = {
  id: crypto.randomUUID(),
  userId: null,
  startedAt: Date.now()
}
sessionStorage.setItem('testSession', JSON.stringify(session))

// After saveUser response
const savedSession = JSON.parse(sessionStorage.getItem('testSession'))
savedSession.userId = userId
sessionStorage.setItem('testSession', JSON.stringify(savedSession))
```

### Session Recovery

If user refreshes page mid-test:

```javascript
const session = JSON.parse(sessionStorage.getItem('testSession'))
if (session) {
  // Fetch existing answers
  const { answers } = await getUserData(session.id)
  // Resume from last answered question
  const lastQuestion = Math.max(...answers.map(a => a.question_id))
  setCurrentQuestion(lastQuestion + 1)
}
```

---

## Performance Considerations

### WAL Mode Benefits

- **Concurrent reads:** Multiple users can query while writes happen
- **No read locks:** Readers don't block writers
- **Atomic commits:** Write transactions are atomic
- **Crash recovery:** Automatic checkpoint management

### Query Optimization

**Indexes cover common queries:**
```sql
-- Fast: Uses idx_session
SELECT * FROM users WHERE session_id = ?;

-- Fast: Uses idx_user_answers
SELECT * FROM test_answers WHERE user_id = ?;

-- Fast: Uses idx_completed
SELECT * FROM users WHERE completed_at IS NOT NULL;
```

**Avoid:**
```sql
-- Slow: Full table scan on TEXT field
SELECT * FROM users WHERE name LIKE '%John%';
```

### Connection Pooling

```javascript
// Single database instance, reused across requests
const db = new Database('./data/tb40.db')

// Better-sqlite3 is synchronous, thread-safe
// No connection pool needed
```

---

## Backup & Maintenance

### Backup Strategy

```bash
# Daily backup
sqlite3 data/tb40.db ".backup 'backups/tb40-$(date +%Y%m%d).db'"

# Or with WAL checkpoint
sqlite3 data/tb40.db "PRAGMA wal_checkpoint(TRUNCATE);"
cp data/tb40.db backups/tb40-$(date +%Y%m%d).db
```

### Database Maintenance

```sql
-- Analyze query performance
ANALYZE;

-- Rebuild indexes (rarely needed)
REINDEX;

-- Vacuum to reclaim space (locks database)
VACUUM;

-- Check integrity
PRAGMA integrity_check;
```

### Monitoring Queries

```sql
-- Total users
SELECT COUNT(*) FROM users;

-- Completion rate
SELECT 
  ROUND(100.0 * SUM(is_complete) / COUNT(*), 2) as completion_rate
FROM users;

-- Average answers per user
SELECT 
  AVG(answer_count) as avg_answers
FROM (
  SELECT COUNT(*) as answer_count 
  FROM test_answers 
  GROUP BY user_id
);

-- Database size
SELECT page_count * page_size / 1024 / 1024 as size_mb 
FROM pragma_page_count(), pragma_page_size();
```

---

## Troubleshooting

### Common Issues

#### "Database is locked"

**Cause:** Another process has an exclusive lock

**Solution:**
```javascript
// Enable busy timeout
db.pragma('busy_timeout = 5000') // Wait 5 seconds

// Or use WAL mode (already enabled)
db.pragma('journal_mode = WAL')
```

#### "No such table"

**Cause:** Database not initialized

**Solution:**
```bash
# Run initialization
node database.js

# Or manually
sqlite3 data/tb40.db < schema.sql
```

#### "UNIQUE constraint failed"

**Cause:** Duplicate session_id or user_id

**Solution:**
```javascript
// Use INSERT OR REPLACE for idempotent operations
db.prepare(`
  INSERT OR REPLACE INTO test_answers 
  (user_id, session_id, question_id, answer_value)
  VALUES (?, ?, ?, ?)
`).run(userId, sessionId, questionId, answerValue)
```

---

## Security Considerations

### SQL Injection Prevention

**Always use prepared statements:**

```javascript
// ✅ SAFE
const stmt = db.prepare('SELECT * FROM users WHERE session_id = ?')
const user = stmt.get(sessionId)

// ❌ UNSAFE
const user = db.prepare(`SELECT * FROM users WHERE session_id = '${sessionId}'`).get()
```

### Data Privacy

- **PII storage:** Names and ages are optional
- **Session IDs:** UUIDs are not guessable
- **No passwords:** Authentication handled separately
- **GDPR compliance:** Users can be deleted via CASCADE

### Access Control

```javascript
// Analytics API requires authentication
app.get('/api/analytics', requireAuth, (req, res) => {
  // Only authenticated users see dashboard
})

// User API is public (needed for test-taking)
app.post('/api/user', (req, res) => {
  // Rate limiting recommended
})
```

---

## Migration Guide

### Adding New Fields

```sql
-- Add column (SQLite doesn't support modifying columns)
ALTER TABLE users ADD COLUMN email TEXT;

-- Create index if needed
CREATE INDEX idx_email ON users(email);
```

### Schema Version Control

```javascript
// Track schema version
db.prepare(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run()

// Check and migrate
const currentVersion = db.prepare('SELECT MAX(version) as v FROM schema_version').get().v || 0

if (currentVersion < 2) {
  db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run()
  db.prepare('INSERT INTO schema_version (version) VALUES (2)').run()
}
```

---

## Testing

### Sample Data Generation

```javascript
// Create test user
const sessionId = crypto.randomUUID()
const userId = db.prepare(`
  INSERT INTO users (session_id, name, age, test_mode)
  VALUES (?, ?, ?, ?)
`).run(sessionId, 'Test User', 25, 'adaptive').lastInsertRowid

// Add sample answers
for (let i = 1; i <= 40; i++) {
  db.prepare(`
    INSERT INTO test_answers (user_id, session_id, question_id, answer_value)
    VALUES (?, ?, ?, ?)
  `).run(userId, sessionId, i, Math.floor(Math.random() * 5) + 1)
}
```

### Unit Tests

```javascript
import { expect, test } from 'vitest'
import Database from 'better-sqlite3'

test('user creation', () => {
  const db = new Database(':memory:')
  // Initialize schema...
  
  const sessionId = crypto.randomUUID()
  const result = db.prepare(`
    INSERT INTO users (session_id, name, age, test_mode)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, 'Test', 25, 'adaptive')
  
  expect(result.changes).toBe(1)
  
  const user = db.prepare('SELECT * FROM users WHERE session_id = ?').get(sessionId)
  expect(user.name).toBe('Test')
})
```

---

## Future Enhancements

### Potential Improvements

1. **Soft deletes** - Add `deleted_at` column instead of hard deletes
2. **User accounts** - Link multiple sessions to user accounts
3. **Result versioning** - Store multiple result calculations
4. **Analytics caching** - Cache dashboard stats with refresh interval
5. **Partitioning** - Archive old sessions to separate tables
6. **Replication** - Set up read replicas for analytics queries

### Scaling Considerations

SQLite is sufficient for:
- **< 100,000 users**
- **< 1,000 concurrent connections**
- **< 1 TB database size**

Beyond that, consider:
- PostgreSQL for better concurrency
- Read replicas for analytics
- Sharding by date range

---

## Related Documentation

- [API Server Setup](./API_SERVER_SETUP.md)
- [Analytics Dashboard](./ANALYTICS_DASHBOARD.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Incident Report: Analytics API](../INCIDENT_ANALYTICS_API.md)

---

**Last Updated:** 2026-06-24  
**Database Version:** 1.0  
**SQLite Version:** 3.x
