import { neon } from '@neondatabase/serverless'
import { logError, logInfo, logWarn } from '../_utils/log.js'

export default async function onRequest(context) {
  const { request, env } = context

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

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }

  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      logWarn('register.missing_fields', { username }, env)
      return new Response(JSON.stringify({ error: "用户名和密码不能为空" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    if (!env.DATABASE_URL) {
      console.error('DATABASE_URL not bound')
      return new Response(JSON.stringify({ error: "Database not bound" }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    const sql = neon(env.DATABASE_URL)

    try {
      // 创建用户表（如果不存在）
      await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, created_at TIMESTAMP DEFAULT NOW())`

      // 检查用户名是否已存在
      const existingUser = await sql`SELECT * FROM users WHERE username = ${username}`.catch(() => null)

      if (existingUser && existingUser.length > 0) {
        logWarn('register.username_exists', { username }, env)
        return new Response(JSON.stringify({ error: "用户名已存在" }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      // 插入新用户
      await sql`INSERT INTO users (username, password) VALUES (${username}, ${password})`

      logInfo('register.success', { username }, env)

      return Response.json(
        { success: true },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    } catch (e) {
      console.error('Database error:', e)
      logError('register.exception', { message: e instanceof Error ? e.message : String(e) }, env)
      return new Response(JSON.stringify({ error: "注册失败" }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }
  } catch (error) {
    console.error('Register error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    logError('register.exception', { message: errorMessage }, env)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}