import { neon } from '@neondatabase/serverless'

export async function logToPostgreSQL(level, message, meta = null) {
  try {
    const DATABASE_URL = process.env.DATABASE_URL
    if (!DATABASE_URL) return
    
    const sql = neon(DATABASE_URL)
    
    await sql`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        level TEXT,
        message TEXT,
        meta TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at)
    `
    
    const metaJson = meta ? JSON.stringify(meta) : null
    await sql`
      INSERT INTO logs(level, message, meta, created_at) VALUES(${level}, ${message}, ${metaJson}, NOW())
    `
  } catch (e) {
    console.error('logToPostgreSQL error:', e)
  }
}

export async function logToD1(env, level, message, meta = null) {
  await logToPostgreSQL(level, message, meta)
}