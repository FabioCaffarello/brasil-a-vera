import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

// Vitest globalSetup. Sobe Postgres 17-alpine, aplica todas as migrations
// (0000-0004, incluindo `CREATE SCHEMA` por bounded context — ADR-013), e
// expõe a URL via `process.env.TEST_DATABASE_URL` para os arquivos de
// teste. Teardown derruba o container ao fim da suite.
//
// Driver de teste: `pg` (TCP) + `drizzle-orm/node-postgres`. Não é o driver
// de produção (neon-http no Worker, neon-serverless na ingestão) — ver
// ADR-015 para a limitação reconhecida.

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/shared/db/migrations',
)

let container: StartedPostgreSqlContainer | null = null

export default async function setup(): Promise<() => Promise<void>> {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('brasil_a_vera_test')
    .withUsername('test')
    .withPassword('test')
    .start()

  const url = container.getConnectionUri()
  process.env.TEST_DATABASE_URL = url

  const pool = new Pool({ connectionString: url })
  try {
    const db = drizzle(pool)
    await migrate(db, { migrationsFolder })
  } finally {
    await pool.end()
  }

  return async () => {
    if (container) {
      await container.stop()
      container = null
    }
  }
}
