import { logError } from '../_utils/log.js'

export default async function onRequest(context) {
  const { request, env } = context
  console.warn('[LOGIN] Edge Function called')
  
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
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "用户名和密码不能为空" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    await env.NOTESD.exec(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, level TEXT, message TEXT, meta TEXT, created_at TEXT)`)
    
    await env.NOTESD.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, admin BOOLEAN DEFAULT false, created_at TEXT)`)
    
    const adminCount = await env.NOTESD.prepare(`SELECT COUNT(*) AS count FROM users WHERE username = 'admin'`).first()
    
    if (!adminCount || adminCount.count === 0) {
      await env.NOTESD.prepare(`INSERT INTO users (username, password, admin, created_at) VALUES ('admin', '123456', 1, strftime('%Y-%m-%dT%H:%M:%S','now','+8 hours'))`).run()
    }
    
    const user = await env.NOTESD.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).first()
    
    if (user && user.password === password) {
      try {
        await env.NOTESD.prepare(`INSERT INTO logs (level, message, meta, created_at) VALUES ('info', '用户登录成功', ?, strftime('%Y-%m-%dT%H:%M:%S','now','+8 hours'))`).bind('用户名: ' + username).run()
      } catch (dbError) {
        console.error('[LOGIN] Database log failed:', dbError)
        logError('login:log:error', { message: dbError?.message }, env)
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Login successful',
        admin: user.admin === 1
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }
    
    try {
      await env.NOTESD.prepare(`INSERT INTO logs (level, message, meta, created_at) VALUES ('warn', '用户登录失败', ?, strftime('%Y-%m-%dT%H:%M:%S','now','+8 hours'))`).bind('用户名: ' + username + ', 原因: 用户名或密码错误').run()
    } catch (dbError) {
      console.error('[LOGIN] Database log failed:', dbError)
      logError('login:log:error', { message: dbError?.message }, env)
    }
    
    return new Response(JSON.stringify({ 
      error: "用户名或密码错误"
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (error) {
    console.error('[LOGIN] Error:', error)
    logError('login:unhandled', { message: error?.message }, env)
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
