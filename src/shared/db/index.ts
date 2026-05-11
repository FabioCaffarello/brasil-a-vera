import { neonConfig, Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from './schema'

// Em Node (ingestão, build, dev), o driver precisa de WebSocket polyfill.
// Em Cloudflare Workers, WebSocket é nativo e este bloco é eliminado pelo
// bundler do adapter.
if (typeof WebSocket === 'undefined') {
  const ws = await import('ws')
  neonConfig.webSocketConstructor = ws.default
}

// Singleton para evitar múltiplas conexões durante hot reload em desenvolvimento.
// O Next.js recria módulos a cada HMR — sem o singleton, cada reload abre uma conexão nova
// até estourar o limite do banco.
const globalForDb = globalThis as unknown as { pool: Pool | undefined }

const pool =
  globalForDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL as string })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
}

export const db = drizzle(pool, { schema })
