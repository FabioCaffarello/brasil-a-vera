// Queries para `usuario.data_request` — Wave 10 Etapa 9.4.
//
// Rastro de solicitações LGPD do titular. Sem repository wrapper;
// Drizzle direto, conforme convenção do projeto. Status flow
// canônico: queued → running → done | failed.
//
// Idempotência: não é por design. Cada clique do usuário cria uma
// nova solicitação. Se o usuário clica "Exportar" 3 vezes, recebe
// 3 rows — todas com a mesma exportação. Auditoria preserva
// integridade dessa decisão.

import { desc, eq, sql } from 'drizzle-orm'

import { dataRequest } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

// TODO(investigate-neon-wake): remover quando ofensor identificado.
// Helper local — só nome de função, sem PII (userId/kind/resultUrl ficam
// de fora do log; resultUrl pode conter signed URL com token).
function logDbHit(fn: string): void {
  console.log(JSON.stringify({ event: 'db_query_uncached', fn }))
}

export type DataRequestKind = 'export' | 'erase' | 'rectify' | 'anonymize'
export type DataRequestStatus = 'queued' | 'running' | 'done' | 'failed'

export interface CreateDataRequestInput {
  userId: string
  kind: DataRequestKind
}

/**
 * Cria uma solicitação no estado `running` (processamento síncrono).
 * Wave 10 não usa Workers Queue (ADR-019); o processador roda inline
 * no request handler. `queued` é reservado para quando async entrar.
 *
 * Retorna o id criado para o caller atualizar status depois.
 */
export async function createDataRequest(
  input: CreateDataRequestInput,
): Promise<string> {
  logDbHit('createDataRequest')
  const rows = await db
    .insert(dataRequest)
    .values({
      userId: input.userId,
      kind: input.kind,
      status: 'running',
    })
    .returning({ id: dataRequest.id })
  return rows[0].id
}

export async function markDataRequestDone(
  id: string,
  resultUrl?: string,
): Promise<void> {
  logDbHit('markDataRequestDone')
  await db
    .update(dataRequest)
    .set({
      status: 'done',
      completedAt: sql`now()`,
      ...(resultUrl ? { resultUrl } : {}),
    })
    .where(eq(dataRequest.id, id))
}

export async function markDataRequestFailed(id: string): Promise<void> {
  logDbHit('markDataRequestFailed')
  await db
    .update(dataRequest)
    .set({
      status: 'failed',
      completedAt: sql`now()`,
    })
    .where(eq(dataRequest.id, id))
}

/**
 * Lista as N mais recentes solicitações do usuário. Usado pelo
 * slot `@meusDados` do /painel (Etapa 9.5 da Wave 10; movido para slot
 * na Fase 2 do refator pós-Wave 10) — bloco "Suas solicitações".
 */
export async function listDataRequestsByUser(
  userId: string,
  limit = 20,
): Promise<
  {
    id: string
    kind: string
    status: string
    requestedAt: Date
    completedAt: Date | null
    resultUrl: string | null
  }[]
> {
  logDbHit('listDataRequestsByUser')
  return await db
    .select({
      id: dataRequest.id,
      kind: dataRequest.kind,
      status: dataRequest.status,
      requestedAt: dataRequest.requestedAt,
      completedAt: dataRequest.completedAt,
      resultUrl: dataRequest.resultUrl,
    })
    .from(dataRequest)
    .where(eq(dataRequest.userId, userId))
    .orderBy(desc(dataRequest.requestedAt))
    .limit(limit)
}
