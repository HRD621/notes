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
    const requestBody = await request.json()
    console.warn('[REGISTER] Request body:', requestBody)
    const { username, password } = requestBody

    if (!username || !password) {
      logWarn('register.missing_fields', { username, requestBody }, env)
      return new Response(JSON.stringify({ error: "用户名和密码不能为空" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    if (!env.NOTESD) {
      console.error('D1 not bound')
      return new Response(JSON.stringify({ error: "Database not bound" }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    try {
      await env.NOTESD.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, created_at TEXT)`)

      const existingUser = await env.NOTESD.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).first()

      if (existingUser) {
        logWarn('register.username_exists', { username }, env)
        return new Response(JSON.stringify({ error: "用户名已存在" }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      await env.NOTESD.prepare(`INSERT INTO users (username, password, created_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%S','now','+8 hours'))`).bind(username, password).run()

      logInfo('register.success', { username }, env)

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
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
