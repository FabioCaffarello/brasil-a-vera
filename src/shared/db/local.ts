import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '@/env'
import * as schema from './schema'

// Cliente de banco para DESENVOLVIMENTO LOCAL: Postgres 17 em Docker
// (docker-compose.yml) via driver `pg` + `drizzle-orm/node-postgres`.
//
// Selecionado quando `DB_DRIVER=node-postgres` no .env.local, para não
// consumir a cota do Neon (free tier) durante o desenvolvimento.
//
// É importado DINAMICAMENTE por ./index.ts apenas nesse modo. Isso mantém
// `pg` (que usa APIs de Node — net/tls — incompatíveis com o isolate do
// Cloudflare Workers) fora do caminho neon-http carregado em produção.
//
// Ver ADR-015 (split de driver por runtime — caminho de dev local).

const pool = new Pool({ connectionString: env.DATABASE_URL })

export const db = drizzle(pool, { schema })
