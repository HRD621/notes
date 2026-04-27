import { neon } from '@neondatabase/serverless'
import { logError } from '../../_utils/log.js'

export default async function onRequest(context) {
  const { request, env } = context
  console.warn('[USERS] Edge Function called')
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }

  try {
    const sql = neon(env.DATABASE_URL)

    // 确保用户表存在
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    
    // 插入默认用户（如果表为空）
    const userCount = await sql`
      SELECT COUNT(*) FROM users
    `
    
    if (userCount[0].count === 0) {
      await sql`
        INSERT INTO users (username, admin) VALUES 
        ('admin', true),
        ('user1', false),
        ('user2', false)
      `
    }

    // 获取所有用户
    const users = await sql`
      SELECT id, username, admin, created_at 
      FROM users 
      ORDER BY created_at DESC
    `

    return new Response(JSON.stringify(users), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (error) {
    console.error('[USERS] Error:', error)
    logError('users:unhandled', { message: error?.message }, env)
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}