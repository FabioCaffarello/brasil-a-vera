import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import { env } from '@/env'
import * as schema from './schema'

// Driver HTTP para Cloudflare Workers.
//
// Por que HTTP e não WebSocket Pool:
// Cloudflare Workers usa isolates onde I/O objects (incluindo
// WebSocket) são amarrados ao request handler que os criou.
// Singleton de Pool em globalThis viola esse contrato e falha
// com "Cannot perform I/O on behalf of a different request"
// sob tráfego concorrente. O driver HTTP do Neon usa fetch
// (sem WebSocket), portanto é compatível com o modelo de
// isolation.
//
// Trade-off: neon-http não suporta transactions multi-statement.
// Não é perda real porque este módulo é usado apenas pelo
// app Workers, que faz somente leitura. Scripts de ingestão
// (que precisam de transactions) usam ingestion/shared/db.ts
// com neon-serverless + Pool em Node 22.
//
// Referências:
// - https://developers.cloudflare.com/workers/observability/errors/
// - https://neon.tech/docs/serverless/serverless-driver
// - ADR-015 (split de driver Neon por runtime; documenta o incidente do
//   Pool singleton e o caminho de correção, e o caminho de dev local).

// Tipo concreto de produção (neon-http). Mantido como o tipo público de `db`
// para não re-tipar os 31 consumidores, os ~20 call-sites de db.execute()
// (.rows) nem as escritas (.insert().returning()): neon-http e node-postgres
// não têm supertipo concreto comum em Drizzle (HKT de result invariante).
type AppDb = NeonHttpDatabase<typeof schema>

// Dev local (Node): quando DB_DRIVER=node-postgres, lê de um Postgres em
// Docker via node-postgres, sem tocar o Neon (cota do free tier). O import
// dinâmico mantém `pg` fora do caminho neon-http do bundle Workers.
//
// O guard `NODE_ENV !== 'production'` é estrutural, não cosmético: o build de
// produção (Next + esbuild do OpenNext) inlina `NODE_ENV='production'` e elimina
// este branch por dead-code, removendo `./local` e o `pg` (node-only,
// incompatível com o isolate do Worker) do bundle Cloudflare. Postgres local é,
// por design, um recurso de `npm run dev` — não de build de produção (que mira
// o Neon). Ver ADR-015.
//
// O cast via `unknown` é a costura inevitável entre dois drivers Drizzle que
// não compartilham tipo concreto: em runtime são intercambiáveis para a
// superfície de query do app (mesmo schema; app read-only + escritas simples),
// validado empiricamente (princípio 13). É a única exceção consciente ao
// princípio 6 (sem `as`), restrita a este branch dev-only.
async function createDb(): Promise<AppDb> {
  if (
    process.env.NODE_ENV !== 'production' &&
    env.DB_DRIVER === 'node-postgres'
  ) {
    const { db } = await import('./local')
    return db as unknown as AppDb
  }

  const sql = neon(env.DATABASE_URL)
  return drizzle(sql, { schema })
}

export const db: AppDb = await createDb()
