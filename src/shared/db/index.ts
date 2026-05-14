import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

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
//   Pool singleton e o caminho de correção).

const sql = neon(process.env.NEON_DATABASE_URL as string)
export const db = drizzle(sql, { schema })
