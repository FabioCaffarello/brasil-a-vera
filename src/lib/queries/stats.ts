import { sql } from 'drizzle-orm'

import { db } from '@/shared/db'

export type DbStats = {
  database: {
    sizeBytes: number
    sizeMb: number
  }
  rowCounts: Record<string, number>
  lastIngestion: Record<string, string | null>
}

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

// COUNT(*) em todas as tabelas via UNION ALL. Endpoint é chamado raramente
// (admin manual + cron diário no máximo), então sequencial scan em tabelas
// maiores (voto_nominal, gasto) é aceitável. Trocar para `pg_class.reltuples`
// se virar gargalo no futuro.
async function getRowCounts(): Promise<Record<string, number>> {
  const result = await db.execute(sql`
    SELECT 'parlamentares.parlamentar' AS table_name, COUNT(*)::bigint AS count FROM parlamentares.parlamentar
    UNION ALL SELECT 'parlamentares.filiacao_partidaria', COUNT(*)::bigint FROM parlamentares.filiacao_partidaria
    UNION ALL SELECT 'parlamentares.membro_comissao', COUNT(*)::bigint FROM parlamentares.membro_comissao
    UNION ALL SELECT 'proposicoes.proposicao', COUNT(*)::bigint FROM proposicoes.proposicao
    UNION ALL SELECT 'proposicoes.proposicao_tema', COUNT(*)::bigint FROM proposicoes.proposicao_tema
    UNION ALL SELECT 'proposicoes.proposicao_autor', COUNT(*)::bigint FROM proposicoes.proposicao_autor
    UNION ALL SELECT 'proposicoes.tramitacao', COUNT(*)::bigint FROM proposicoes.tramitacao
    UNION ALL SELECT 'votacoes.votacao', COUNT(*)::bigint FROM votacoes.votacao
    UNION ALL SELECT 'votacoes.voto_nominal', COUNT(*)::bigint FROM votacoes.voto_nominal
    UNION ALL SELECT 'votacoes.orientacao', COUNT(*)::bigint FROM votacoes.orientacao
    UNION ALL SELECT 'gastos.gasto', COUNT(*)::bigint FROM gastos.gasto
  `)

  const counts: Record<string, number> = {}
  for (const row of result.rows) {
    if (typeof row.table_name === 'string' && row.count !== null) {
      counts[row.table_name] = Number(row.count)
    }
  }
  return counts
}

async function getLastIngestion(): Promise<Record<string, string | null>> {
  const result = await db.execute(sql`
    SELECT 'parlamentar' AS root, MAX(ingested_at) AS ts FROM parlamentares.parlamentar
    UNION ALL SELECT 'proposicao', MAX(ingested_at) FROM proposicoes.proposicao
    UNION ALL SELECT 'votacao', MAX(ingested_at) FROM votacoes.votacao
    UNION ALL SELECT 'gasto', MAX(ingested_at) FROM gastos.gasto
  `)

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
