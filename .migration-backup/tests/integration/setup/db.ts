import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '@/shared/db/schema'

// Mock de `@/shared/db` para testes integrados.
//
// `vi.mock('@/shared/db', () => import('../setup/db'))` em cada
// `*.integration.test.ts` redireciona o singleton `db` produção
// (neon-http no Worker) para este módulo. Cada caminho de query roda
// contra Postgres real do testcontainer via driver `pg`.
//
// `TEST_DATABASE_URL` é setado pelo globalSetup em `container.ts` antes
// de qualquer arquivo de teste carregar.

const url = process.env.TEST_DATABASE_URL
if (!url) {
  throw new Error(
    'TEST_DATABASE_URL not set — integration tests must run via vitest.integration.config.ts (globalSetup sobe o container e exporta a URL).',
  )
}

const pool = new Pool({ connectionString: url })

export const db = drizzle(pool, { schema })
