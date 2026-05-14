// Conexão de banco para scripts de ingestão (Node 22).
//
// Não reutilizamos `src/shared/db/index.ts` porque ele tem top-level await
// para polyfill condicional de WebSocket (necessário em Cloudflare Workers).
// Em Node, o polyfill é incondicional e sincrono — assim evitamos forçar
// `"type": "module"` no package.json, que tem efeitos colaterais no Next.

import { neonConfig, Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'

import * as schema from '@/shared/db/schema'

neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não definido. Exporte do .env.local antes de rodar ingestão.',
  )
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })
