import { neon } from '@neondatabase/serverless'
import { logToPostgreSQL } from './_utils/log.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end('')
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { username, password } = req.body || {}
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' })
    }

    const DATABASE_URL = process.env.DATABASE_URL
    if (!DATABASE_URL) {
      console.error('DATABASE_URL not bound')
      return res.status(500).json({ success: false, error: 'Database not bound' })
    }

    const sql = neon(DATABASE_URL)

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE,
          password TEXT,
          admin BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `

      const result = await sql`SELECT * FROM users WHERE username = ${username}`
      
      if (result.length === 0) {
        await logToPostgreSQL('warn', '用户登录失败', { ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress, reason: '用户不存在' })
        return res.status(401).json({ success: false, error: '用户名或密码错误' })
      }
      
      const user = result[0]
      if (user.password !== password) {
        await logToPostgreSQL('warn', '用户登录失败', { ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress, reason: '密码错误' })
        return res.status(401).json({ success: false, error: '用户名或密码错误' })
      }
      
      await logToPostgreSQL('info', '用户登录成功', { ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress, username })
      return res.json({ success: true, admin: user.admin || false })
    } catch (e) {
      console.error('Database error:', e)
      return res.status(500).json({ success: false, error: '登录失败' })
    }
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}