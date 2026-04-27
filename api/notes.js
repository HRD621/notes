import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)')
    console.warn('[vercel] Notes table initialized')
  } catch (e) {
    console.error('[vercel] Failed to initialize notes table:', e)
  }
}

async function getAuthUser(req) {
  const username = req.headers['x-username']
  const authHeader = req.headers.authorization || ''
  const password = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!username || !password) {
    return null
  }

  const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password])
  return result.rows[0] || null
}

function formatNoteRow(row) {
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    tags: row.tags ? JSON.parse(row.tags) : [],
    createdAt: row.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Username')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    await initDatabase()

    const user = await getAuthUser(req)
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    if (req.method === 'GET') {
      const targetUserId = req.query.userId ? parseInt(req.query.userId, 10) : null
      const query = 'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC'
      const params = [targetUserId && user.admin ? targetUserId : user.id]

      const result = await pool.query(query, params)
      return res.json(result.rows.map(formatNoteRow))
    }

    if (req.method === 'POST') {
      const { id = String(Date.now()), title = '', content = '', tags = [] } = req.body || {}
      const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : typeof tags === 'string' ? tags : JSON.stringify([])

      await pool.query(
        `INSERT INTO notes (id, user_id, title, content, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           tags = EXCLUDED.tags,
           updated_at = EXCLUDED.updated_at`,
        [id, user.id, title, content, tagsJson, new Date().toISOString(), new Date().toISOString()]
      )

      return res.json({ success: true, id })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (e) {
    console.error('Notes API error:', e)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
