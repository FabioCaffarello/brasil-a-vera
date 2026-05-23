import { sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao } from '@/modules/proposicoes/domain/schema'
import { votacao } from '@/modules/votacoes/domain/schema'
import { db } from '@/shared/db'

// Estatísticas públicas consumidas por componentes server-side renderizando
// rotas públicas (home cards, OGs de listagem). Subset reduzido vs
// `getDbStats()` (admin): sem pg_database_size, sem lastIngestion por root,
// sem rowCounts de todas as tabelas.
//
// 4 queries por miss (GROUP BY casa + COUNT × 2 + MAX). Home é
// `force-dynamic` (ver `src/app/page.tsx` — issue #58 para R2 incremental
// cache), então o cache aqui é a única camada entre a home e o Neon.

export interface PublicStats {
  totalParlamentares: number
  parlamentaresPorCasa: { camara: number; senado: number }
  totalVotacoes: number
  totalProposicoes: number
  /** ISO string da última votação ingerida, ou null se nenhuma. */
  ultimaAtualizacaoVotacoes: string | null
}

export async function getPublicStats(): Promise<PublicStats> {
  return cached('stats:public', TTL.publicStats, async () => {
    const [parlamentaresRows, votacoesRow, proposicoesRow, ultimaRow] =
      await Promise.all([
        db
          .select({
            casa: parlamentar.casa,
            n: sql<number>`count(*)::int`,
          })
          .from(parlamentar)
          .groupBy(parlamentar.casa),
        db.select({ n: sql<number>`count(*)::int` }).from(votacao),
        db.select({ n: sql<number>`count(*)::int` }).from(proposicao),
        db
          .select({ ts: sql<Date | string | null>`max(${votacao.ingestedAt})` })
          .from(votacao),
      ])

    let camara = 0
    let senado = 0
    for (const row of parlamentaresRows) {
      if (row.casa === 'CAMARA') camara = row.n
      else if (row.casa === 'SENADO') senado = row.n
    }

    const ts = ultimaRow[0]?.ts
    const ultimaAtualizacaoVotacoes =
      ts === null || ts === undefined
        ? null
        : ts instanceof Date
          ? ts.toISOString()
          : String(ts)

    return {
      totalParlamentares: camara + senado,
      parlamentaresPorCasa: { camara, senado },
      totalVotacoes: votacoesRow[0]?.n ?? 0,
      totalProposicoes: proposicoesRow[0]?.n ?? 0,
      ultimaAtualizacaoVotacoes,
    }
  })
}
