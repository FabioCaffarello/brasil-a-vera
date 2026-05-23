import { sql } from 'drizzle-orm'
import { gasto } from '@/modules/gastos/domain/schema'
import {
  filiacaoPartidaria,
  membroComissao,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
  proposicaoTema,
  tramitacao,
} from '@/modules/proposicoes/domain/schema'
import {
  alertDelivery,
  consentLog,
  dataRequest,
  follows,
  userProfile,
} from '@/modules/usuario/domain/schema'
import {
  orientacao,
  votacao,
  votoNominal,
} from '@/modules/votacoes/domain/schema'
import { db } from '@/shared/db'

import { FOLLOWS_CAP_PER_USER } from './follows'

export type UsuarioStats = {
  /** Perfis ativos (deleted_at IS NULL). */
  user_profile_active: number
  /** Perfis soft-deletados na janela 30d antes do hard-delete. */
  user_profile_pending_delete: number
  /** Total de relações follows. */
  follows_total: number
  /** Usuários no cap (200 follows) — sinal de abuso/quase abuso. */
  follows_users_at_cap: number
  /** Contagem por status (pending, sent, failed, skipped). */
  alert_delivery_by_status: Record<string, number>
  /** Timestamp do último delivery `sent` (cron alive check). */
  alert_delivery_last_sent_at: string | null
  /** Total de linhas consent_log (audit volume). */
  consent_log_total: number
  /** Contagem por kind LGPD (export, erase, anonymize, rectify). */
  data_request_by_kind: Record<string, number>
}

export type DbStats = {
  database: {
    sizeBytes: number
    sizeMb: number
  }
  rowCounts: Record<string, number>
  lastIngestion: Record<string, string | null>
  usuario: UsuarioStats
}

// Labels que aparecem no JSON de resposta. Resolvemos via ref Drizzle (não
// string SQL hardcoded) para evitar mismatch entre nome do const JS e nome
// real da tabela no Postgres — bug que existiu antes deste arquivo usar refs
// (const `orientacao` aponta para tabela `orientacao_bancada`).
const ROW_COUNT_TABLES = [
  { label: 'parlamentares.parlamentar', ref: parlamentar },
  { label: 'parlamentares.filiacao_partidaria', ref: filiacaoPartidaria },
  { label: 'parlamentares.membro_comissao', ref: membroComissao },
  { label: 'proposicoes.proposicao', ref: proposicao },
  { label: 'proposicoes.proposicao_tema', ref: proposicaoTema },
  { label: 'proposicoes.proposicao_autor', ref: proposicaoAutor },
  { label: 'proposicoes.tramitacao', ref: tramitacao },
  { label: 'votacoes.votacao', ref: votacao },
  { label: 'votacoes.voto_nominal', ref: votoNominal },
  { label: 'votacoes.orientacao_bancada', ref: orientacao },
  { label: 'gastos.gasto', ref: gasto },
] as const

const LAST_INGESTION_TABLES = [
  { label: 'parlamentar', ref: parlamentar },
  { label: 'proposicao', ref: proposicao },
  { label: 'votacao', ref: votacao },
  { label: 'gasto', ref: gasto },
] as const

export async function getDbStats(): Promise<DbStats> {
  // TODO(investigate-neon-wake): remover quando ofensor identificado.
  console.log(
    JSON.stringify({
      event: 'db_query_uncached',
      fn: 'getDbStats',
    }),
  )
  const [sizeBytes, rowCounts, lastIngestion, usuario] = await Promise.all([
    getDatabaseSize(),
    getRowCounts(),
    getLastIngestion(),
    getUsuarioStats(),
  ])

  return {
    database: {
      sizeBytes,
      sizeMb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
    },
    rowCounts,
    lastIngestion,
    usuario,
  }
}

/**
 * Métricas Wave 10 — bounded context Usuário (LGPD, alertas, follows).
 * Roda em paralelo com os demais blocos do /api/stats. Cada subquery é
 * leve (COUNT / MAX / GROUP BY pequenos), sem JOIN cross-schema.
 */
async function getUsuarioStats(): Promise<UsuarioStats> {
  const [
    profileActive,
    profilePendingDelete,
    followsTotal,
    followsAtCap,
    deliveryByStatus,
    deliveryLastSent,
    consentTotal,
    requestsByKind,
  ] = await Promise.all([
    countWhere(userProfile, sql`${userProfile.deletedAt} IS NULL`),
    countWhere(userProfile, sql`${userProfile.deletedAt} IS NOT NULL`),
    countAll(follows),
    countUsersAtFollowsCap(),
    groupCount(alertDelivery, alertDelivery.status),
    maxTimestamp(alertDelivery, alertDelivery.deliveredAt),
    countAll(consentLog),
    groupCount(dataRequest, dataRequest.kind),
  ])

  return {
    user_profile_active: profileActive,
    user_profile_pending_delete: profilePendingDelete,
    follows_total: followsTotal,
    follows_users_at_cap: followsAtCap,
    alert_delivery_by_status: deliveryByStatus,
    alert_delivery_last_sent_at: deliveryLastSent,
    consent_log_total: consentTotal,
    data_request_by_kind: requestsByKind,
  }
}

// --- helpers internos genéricos ---

async function countAll(
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle ref aceita tabelas distintas; o callsite garante o tipo
  table: any,
): Promise<number> {
  const result = await db.execute(
    sql`SELECT COUNT(*)::bigint AS count FROM ${table}`,
  )
  return Number(result.rows[0]?.count ?? 0)
}

async function countWhere(
  // biome-ignore lint/suspicious/noExplicitAny: idem
  table: any,
  // biome-ignore lint/suspicious/noExplicitAny: cláusula SQL fragmentada
  whereClause: any,
): Promise<number> {
  const result = await db.execute(
    sql`SELECT COUNT(*)::bigint AS count FROM ${table} WHERE ${whereClause}`,
  )
  return Number(result.rows[0]?.count ?? 0)
}

async function countUsersAtFollowsCap(): Promise<number> {
  // "Quantos usuários têm >= cap follows?". Subquery em vez de DISTINCT
  // direto para reportar `users`, não `relações`.
  const result = await db.execute(
    sql`SELECT COUNT(*)::bigint AS count FROM (
      SELECT ${follows.userId}
      FROM ${follows}
      GROUP BY ${follows.userId}
      HAVING COUNT(*) >= ${FOLLOWS_CAP_PER_USER}
    ) sub`,
  )
  return Number(result.rows[0]?.count ?? 0)
}

async function groupCount(
  // biome-ignore lint/suspicious/noExplicitAny: idem
  table: any,
  // biome-ignore lint/suspicious/noExplicitAny: idem
  column: any,
): Promise<Record<string, number>> {
  const result = await db.execute(
    sql`SELECT ${column}::text AS key, COUNT(*)::bigint AS count
        FROM ${table}
        GROUP BY ${column}`,
  )
  const out: Record<string, number> = {}
  for (const row of result.rows) {
    if (typeof row.key === 'string' && row.count !== null) {
      out[row.key] = Number(row.count)
    }
  }
  return out
}

async function maxTimestamp(
  // biome-ignore lint/suspicious/noExplicitAny: idem
  table: any,
  // biome-ignore lint/suspicious/noExplicitAny: idem
  column: any,
): Promise<string | null> {
  const result = await db.execute(
    sql`SELECT MAX(${column}) AS ts FROM ${table}`,
  )
  const ts = result.rows[0]?.ts
  if (ts === null || ts === undefined) return null
  if (ts instanceof Date) return ts.toISOString()
  return String(ts)
}

async function getDatabaseSize(): Promise<number> {
  const result = await db.execute(sql`
    SELECT pg_database_size(current_database())::text AS size
  `)
  const row = result.rows[0]
  if (!row || row.size === null || row.size === undefined) return 0
  return Number(row.size)
}

// COUNT(*) em todas as tabelas via UNION ALL de queries individuais por ref.
// Endpoint é chamado raramente (admin manual + cron diário no máximo), então
// sequencial scan em tabelas maiores (voto_nominal, gasto) é aceitável.
// Trocar para `pg_class.reltuples` se virar gargalo.
async function getRowCounts(): Promise<Record<string, number>> {
  const queries = ROW_COUNT_TABLES.map(
    ({ label, ref }) =>
      sql`SELECT ${label}::text AS table_name, COUNT(*)::bigint AS count FROM ${ref}`,
  )
  const result = await db.execute(sql.join(queries, sql` UNION ALL `))

  const counts: Record<string, number> = {}
  for (const row of result.rows) {
    if (typeof row.table_name === 'string' && row.count !== null) {
      counts[row.table_name] = Number(row.count)
    }
  }
  return counts
}

async function getLastIngestion(): Promise<Record<string, string | null>> {
  const queries = LAST_INGESTION_TABLES.map(
    ({ label, ref }) =>
      sql`SELECT ${label}::text AS root, MAX(ingested_at) AS ts FROM ${ref}`,
  )
  const result = await db.execute(sql.join(queries, sql` UNION ALL `))

  const lastIngestion: Record<string, string | null> = {}
  for (const row of result.rows) {
    if (typeof row.root !== 'string') continue
    const ts = row.ts
    if (ts === null || ts === undefined) {
      lastIngestion[row.root] = null
    } else if (ts instanceof Date) {
      lastIngestion[row.root] = ts.toISOString()
    } else {
      lastIngestion[row.root] = String(ts)
    }
  }
  return lastIngestion
}
