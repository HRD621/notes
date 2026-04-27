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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
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

    const { id } = req.query
    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing note ID' })
    }

    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, user.id])
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Note not found' })
      }
      return res.json(formatNoteRow(result.rows[0]))
    }

    if (req.method === 'PUT') {
      const { title, content, tags } = req.body || {}
      const existing = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, user.id])
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Note not found' })
      }

      await pool.query(
        'UPDATE notes SET title = $1, content = $2, tags = $3, updated_at = $4 WHERE id = $5 AND user_id = $6',
        [title ?? existing.rows[0].title, content ?? existing.rows[0].content, JSON.stringify(tags || []), new Date().toISOString(), id, user.id]
      )
      return res.json({ success: true })
    }

    if (req.method === 'DELETE') {
      const existing = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, user.id])
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Note not found' })
      }
      await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, user.id])
      return res.json({ success: true })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (e) {
    console.error('Notes API error:', e)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
