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

  if (request.method === 'GET') {
    try {
      const sql = neon(env.DATABASE_URL)

      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          admin BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      
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
      const sql = neon(env.DATABASE_URL)
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const userId = parseInt(pathParts[pathParts.length - 1])
      
      if (isNaN(userId)) {
        return new Response(JSON.stringify({ success: false, error: '无效的用户ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      // 获取请求头中的用户名
      const username = request.headers.get('x-username')
      if (!username) {
        return new Response(JSON.stringify({ success: false, error: '未授权' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      // 检查当前用户是否是管理员
      const adminCheck = await sql`SELECT admin FROM users WHERE username = ${username}`
      if (!adminCheck.length || !adminCheck[0].admin) {
        return new Response(JSON.stringify({ success: false, error: '权限不足' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      if (username === String(userId)) {
        return new Response(JSON.stringify({ success: false, error: '不能删除自己' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      // 获取目标用户信息
      const targetUser = await sql`SELECT * FROM users WHERE id = ${userId}`
      if (!targetUser.length) {
        return new Response(JSON.stringify({ success: false, error: '用户不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      if (targetUser[0].admin) {
        return new Response(JSON.stringify({ success: false, error: '不能删除管理员用户' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      // 先删除该用户的笔记
      await sql`DELETE FROM notes WHERE user_id = ${userId}`
      
      // 删除用户
      await sql`DELETE FROM users WHERE id = ${userId}`
      
      logError('admin:delete_user', { admin: username, deletedUser: targetUser[0].username, userId }, env)
      
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