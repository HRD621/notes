import { logToD1 } from '../../_utils/log'
import type { PagesFunction } from '../../types'

export const onRequest: PagesFunction = async ({ request, env }) => {
  console.warn('[USERS] Edge Function called')
  
  if (!env.NOTESD) {
    return new Response(
      JSON.stringify({
        error: "Database not bound",
        message: "⚠️ D1 数据库尚未绑定",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
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
      await env.NOTESD.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT,
          admin BOOLEAN DEFAULT false,
          created_at TEXT
        )
      `)

      const result = await env.NOTESD.prepare(
        `SELECT id, username, admin, created_at FROM users ORDER BY created_at DESC`
      ).all<{ id: number; username: string; admin: number; created_at: string }>();

      const users = (result.results || []).map(row => ({
        id: row.id,
        username: row.username,
        admin: row.admin === 1,
        createdAt: row.created_at || new Date().toISOString()
      }));

      await logToD1(env, 'info', 'admin.users.list', { count: users.length })
      
      return new Response(JSON.stringify(users), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    } catch (error) {
      console.error('[USERS] Error:', error)
      await logToD1(env, 'error', 'admin.users.get.exception', { message: error instanceof Error ? error.message : String(error) })
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
      
      const adminCheck = await env.NOTESD.prepare(
        `SELECT admin FROM users WHERE username = ?`
      ).bind(username).first<{ admin: number }>()
      
      if (!adminCheck || adminCheck.admin !== 1) {
        return new Response(JSON.stringify({ success: false, error: '权限不足' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      const currentUser = await env.NOTESD.prepare(
        `SELECT id FROM users WHERE username = ?`
      ).bind(username).first<{ id: number }>()
      
      if (!currentUser || currentUser.id === userId) {
        return new Response(JSON.stringify({ success: false, error: '不能删除自己' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
      
      const targetUser = await env.NOTESD.prepare(
        `SELECT username, admin FROM users WHERE id = ?`
      ).bind(userId).first<{ username: string; admin: number }>()
      
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
      
      await logToD1(env, 'info', 'admin.users.delete', { admin: username, deletedUser: targetUser.username, userId })
      
      return new Response(JSON.stringify({ success: true, message: '用户删除成功' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    } catch (error) {
      console.error('[USERS] Delete Error:', error)
      await logToD1(env, 'error', 'admin.users.delete.exception', { message: error instanceof Error ? error.message : String(error) })
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
