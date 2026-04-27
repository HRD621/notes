import { neon } from '@neondatabase/serverless'
import { logError, logToDatabase } from '../_utils/log.js'

export default async function onRequest(context) {
  const { request, env } = context
  const method = request.method
  const url = new URL(request.url)
  const path = url.pathname
  const key = path.split('/').pop()
  
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  try {
    const sql = neon(env.DATABASE_URL)
    
    // 创建 order 表（如果不存在）
    await sql`
      CREATE TABLE IF NOT EXISTS order_data (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    
    if (method === 'GET') {
      try {
        const result = await sql`
          SELECT data FROM order_data WHERE key = ${key}
        `
        
        if (result && result.length > 0) {
          try {
            const data = JSON.parse(result[0].data)
            return new Response(JSON.stringify({ success: true, data }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            })
          } catch (e) {
            return new Response(JSON.stringify({ success: true, data: null }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            })
          }
        } else {
          return new Response(JSON.stringify({ success: true, data: null }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          })
        }
      } catch (dbError) {
        console.error('Database query failed:', dbError)
        logError('order:get:error', { message: dbError?.message }, env)
        return new Response(JSON.stringify({ success: true, data: null }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        })
      }
    }

    if (method === 'POST') {
      try {
        const body = await request.json()
        const data = JSON.stringify(body)
        
        await sql`
          INSERT INTO order_data (key, data, updated_at) 
          VALUES (${key}, ${data}, NOW())
          ON CONFLICT (key) DO UPDATE SET 
            data = EXCLUDED.data,
            updated_at = NOW()
        `
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        })
      } catch (dbError) {
        console.error('Database save failed:', dbError)
        logError('order:post:error', { message: dbError?.message }, env)
        return new Response(JSON.stringify({ success: false, error: 'Database save failed' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        })
      }
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (error) {
    console.error('Order API error:', error)
    logError('order:unhandled', { message: error?.message }, env)
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}