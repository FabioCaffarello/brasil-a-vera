import { sql } from 'drizzle-orm'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao } from '@/modules/proposicoes/domain/schema'
import { votacao } from '@/modules/votacoes/domain/schema'
import { db } from '@/shared/db'

// Estatísticas públicas consumidas por componentes server-side renderizando
// rotas públicas (home cards, /docs futuramente). Subset reduzido vs
// `getDbStats()` (admin): sem pg_database_size, sem lastIngestion por root,
// sem rowCounts de todas as tabelas.
//
// 3 queries simples (COUNT × 3 + MAX). Cache via `revalidate` da página
// que consume (home tem revalidate 3600).

export interface PublicStats {
  totalParlamentares: number
  totalVotacoes: number
  totalProposicoes: number
  /** ISO string da última votação ingerida, ou null se nenhuma. */
  ultimaAtualizacaoVotacoes: string | null
}

export async function getPublicStats(): Promise<PublicStats> {
  const [parlamentaresRow, votacoesRow, proposicoesRow, ultimaRow] =
    await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(parlamentar),
      db.select({ n: sql<number>`count(*)::int` }).from(votacao),
      db.select({ n: sql<number>`count(*)::int` }).from(proposicao),
      db
        .select({ ts: sql<Date | string | null>`max(${votacao.ingestedAt})` })
        .from(votacao),
    ])

  const ts = ultimaRow[0]?.ts
  const ultimaAtualizacaoVotacoes =
    ts === null || ts === undefined
      ? null
      : ts instanceof Date
        ? ts.toISOString()
        : String(ts)

  return {
    totalParlamentares: parlamentaresRow[0]?.n ?? 0,
    totalVotacoes: votacoesRow[0]?.n ?? 0,
    totalProposicoes: proposicoesRow[0]?.n ?? 0,
    ultimaAtualizacaoVotacoes,
  }
}
