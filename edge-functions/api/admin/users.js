import { logError } from '../../_utils/log.js'

export default async function onRequest(context) {
  const { request, env } = context
  console.warn('[USERS] Edge Function called')
  
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

  if (request.method === 'GET') {
    try {
      await env.NOTESD.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT, admin BOOLEAN DEFAULT false, created_at TEXT)`)
      
      const userCount = await env.NOTESD.prepare(`SELECT COUNT(*) AS count FROM users`).first()
      
      if (!userCount || userCount.count === 0) {
        await env.NOTESD.prepare(`INSERT INTO users (username, password, admin, created_at) VALUES ('admin', '123456', 1, strftime('%Y-%m-%dT%H:%M:%S','now','+8 hours'))`).run()
      }

      const result = await env.NOTESD.prepare(`SELECT id, username, admin, created_at FROM users ORDER BY created_at DESC`).all()
      const users = (result.results || []).map(row => ({
        id: row.id,
        username: row.username,
        admin: row.admin === 1,
        createdAt: row.created_at || new Date().toISOString()
      }))

      return new Response(JSON.stringify(users), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    } catch (error) {
      console.error('[USERS] Error:', error)
      logError('users:get:unhandled', { message: error?.message }, env)
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

  if (request.method === 'DELETE') {
    try {
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const userId = parseInt(pathParts[pathParts.length - 1])
      
      if (isNaN(userId)) {
        return new Response(JSON.stringify({ success: false, error: '无效的用户ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      const username = request.headers.get('x-username')
      if (!username) {
        return new Response(JSON.stringify({ success: false, error: '未授权' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      const adminCheck = await env.NOTESD.prepare(`SELECT admin FROM users WHERE username = ?`).bind(username).first()
      if (!adminCheck || adminCheck.admin !== 1) {
        return new Response(JSON.stringify({ success: false, error: '权限不足' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      const currentUser = await env.NOTESD.prepare(`SELECT id FROM users WHERE username = ?`).bind(username).first()
      if (!currentUser || currentUser.id === userId) {
        return new Response(JSON.stringify({ success: false, error: '不能删除自己' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      const targetUser = await env.NOTESD.prepare(`SELECT username, admin FROM users WHERE id = ?`).bind(userId).first()
      if (!targetUser) {
        return new Response(JSON.stringify({ success: false, error: '用户不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      if (targetUser.admin === 1) {
        return new Response(JSON.stringify({ success: false, error: '不能删除管理员用户' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      await env.NOTESD.prepare(`DELETE FROM notes WHERE user_id = ?`).bind(userId).run()
      await env.NOTESD.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run()
      
      logError('admin:delete_user', { admin: username, deletedUser: targetUser.username, userId }, env)
      
      return new Response(JSON.stringify({ success: true, message: '用户删除成功' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    } catch (error) {
      console.error('[USERS] Delete Error:', error)
      logError('users:delete:unhandled', { message: error?.message }, env)
      return new Response(JSON.stringify({ 
        success: false, 
        error: '删除用户失败',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
