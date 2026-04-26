import { logToD1 } from '../_utils/log'
import type { PagesFunction } from '../types'

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      await logToD1(env, 'warn', 'register.missing_fields')
      return new Response(JSON.stringify({ error: "用户名和密码不能为空" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    if (!env.NOTESD) {
      console.error('D1 not bound');
      return new Response(JSON.stringify({ error: "Database not bound" }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    try {
      // 创建用户表（如果不存在）
      await env.NOTESD.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, created_at TEXT)`);

      // 检查用户名是否已存在
      const existingUser = await env.NOTESD.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).first();

      if (existingUser) {
        await logToD1(env, 'warn', 'register.username_exists')
        return new Response(JSON.stringify({ error: "用户名已存在" }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // 插入新用户
      await env.NOTESD.prepare(`INSERT INTO users (username, password, created_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%S','now','+8 hours'))`).bind(username, password).run();

      await logToD1(env, 'info', 'register.success', { username })

      return Response.json(
        { success: true },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    } catch (e) {
      console.error('Database error:', e);
      await logToD1(env, 'error', 'register.exception', { message: e instanceof Error ? e.message : String(e) })
      return new Response(JSON.stringify({ error: "注册失败" }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error)
    await logToD1(env, 'error', 'register.exception', { message: errorMessage })
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};