import { neon } from '@neondatabase/serverless'
import { logToPostgreSQL } from './_utils/log.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end(
      '',
      {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    )
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { username, password } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" })
    }

    const DATABASE_URL = process.env.DATABASE_URL

    if (!DATABASE_URL) {
      console.error('DATABASE_URL not bound')
      return res.status(500).json({ error: "Database not bound" })
    }

    const sql = neon(DATABASE_URL)

    try {
      await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, created_at TIMESTAMP DEFAULT NOW())`

      const existingUser = await sql`SELECT * FROM users WHERE username = ${username}`.catch(() => null)

      if (existingUser && existingUser.length > 0) {
        return res.status(400).json({ error: "用户名已存在" })
      }

      await sql`INSERT INTO users (username, password) VALUES (${username}, ${password})`

      await logToPostgreSQL('info', 'register.success', { username })

      return res.status(200).json({ success: true })
    } catch (e) {
      console.error('Database error:', e)
      return res.status(500).json({ error: "注册失败" })
    }
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ error: "Internal server error" })
  }
}