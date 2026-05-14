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
  orientacao,
  votacao,
  votoNominal,
} from '@/modules/votacoes/domain/schema'
import { db } from '@/shared/db'

export type DbStats = {
  database: {
    sizeBytes: number
    sizeMb: number
  }
  rowCounts: Record<string, number>
  lastIngestion: Record<string, string | null>
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
  const [sizeBytes, rowCounts, lastIngestion] = await Promise.all([
    getDatabaseSize(),
    getRowCounts(),
    getLastIngestion(),
  ])

  return {
    database: {
      sizeBytes,
      sizeMb: Math.round((sizeBytes / (1024 * 1024)) * 100) / 100,
    },
    rowCounts,
    lastIngestion,
  }
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
