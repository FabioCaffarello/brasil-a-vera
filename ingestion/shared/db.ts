// Conexão de banco para scripts de ingestão (Node 22).
//
// Não reutilizamos `src/shared/db/index.ts`: o app usa neon-http (read-only no
// Worker, sem transactions multi-statement) e roda como ESM; a ingestão precisa
// de neon-serverless + Pool para as transactions DELETE+INSERT (ADR-014) e roda
// como CJS via tsx (sem top-level await). Drivers divergem por runtime; só o
// schema é compartilhado (ADR-015).

import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless'
import {
  drizzle as drizzleNeon,
  type NeonDatabase,
} from 'drizzle-orm/neon-serverless'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Pool as PgPool } from 'pg'
import ws from 'ws'

import * as schema from '@/shared/db/schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error(
    'DATABASE_URL não definido. Exporte do .env.local antes de rodar ingestão.',
  )
}

// Tipo concreto de produção (neon-serverless). Mantido como o tipo público de
// `db` para preservar a tipagem de `.transaction()` (DELETE+INSERT do ADR-014,
// 8 scripts) e de `db.execute()` (ops). neon-serverless e node-postgres não
// têm supertipo concreto comum em Drizzle (HKT de result invariante).
type IngestDb = NeonDatabase<typeof schema>

// Dev local: quando DB_DRIVER=node-postgres, a ingestão grava num Postgres
// em Docker via node-postgres, sem tocar o Neon (cota do free tier). Em CI/
// produção (DB_DRIVER ausente) segue em neon-serverless + Pool + ws.
//
// Síncrono (sem top-level await): a ingestão roda como CJS via tsx, que não
// suporta TLA. Em Node, importar `pg` e `ws` estaticamente é inofensivo.
//
// O cast via `unknown` é a mesma costura entre drivers de src/shared/db/index.ts
// — intercambiáveis em runtime para a superfície de query da ingestão, validado
// empiricamente (princípio 13). Única exceção consciente ao princípio 6 (sem
// `as`), restrita ao branch dev-only. Ver ADR-015.
function createDb(): IngestDb {
  if (process.env.DB_DRIVER === 'node-postgres') {
    return drizzlePg(new PgPool({ connectionString }), {
      schema,
    }) as unknown as IngestDb
  }

  neonConfig.webSocketConstructor = ws
  return drizzleNeon(new NeonPool({ connectionString }), { schema })
}

export const db: IngestDb = createDb()
