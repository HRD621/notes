import { neon } from '@neondatabase/serverless'
import { logToD1 } from '../../_utils/log'
import type { PagesFunction } from '../../types'

export const onRequest: PagesFunction = async ({ request, env }) => {
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

      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT,
          admin BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `

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
      await logToD1(env, 'error', 'users:get:unhandled', { message: error instanceof Error ? error.message : String(error) })
      return new Response(JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error)
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
      
      await sql`DELETE FROM notes WHERE user_id = ${userId}`
      await sql`DELETE FROM users WHERE id = ${userId}`
      
      await logToD1(env, 'info', 'admin:delete_user', { admin: username, deletedUser: targetUser[0].username, userId })
      
      return new Response(JSON.stringify({ success: true, message: '用户删除成功' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    } catch (error) {
      console.error('[USERS] Delete Error:', error)
      await logToD1(env, 'error', 'users:delete:unhandled', { message: error instanceof Error ? error.message : String(error) })
      return new Response(JSON.stringify({ 
        success: false, 
        error: '删除用户失败',
        details: error instanceof Error ? error.message : String(error)
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
