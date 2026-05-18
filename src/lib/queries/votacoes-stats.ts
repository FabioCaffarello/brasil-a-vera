import { sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { votacao } from '@/shared/db/schema'

// Stats globais alimentam o hero + KpiStrip narrativa da listagem
// /votacoes (Wave 9 Sprint 9.1 PR1/PR2). 6h de TTL (votacoesStatsGlobais)
// alinha com cadência do cron de ingestão. Janelas 12m protegem stats
// "aprovadas"/"rejeitadas" de inflar com históricas paradas, espelhando
// o critério da Wave 8 em proposicoes-stats.

export interface EstatisticasGlobaisVotacoes {
  /** Total de votações no banco, qualquer época, qualquer casa. */
  total: number
  /** Aprovadas (aprovada=true) com data_hora nos últimos 12 meses. */
  aprovadas12m: number
  /** Rejeitadas (aprovada=false) com data_hora nos últimos 12 meses. */
  rejeitadas12m: number
  /** Ano da votação mais antiga (para "N votações desde AAAA"). */
  anoMaisAntigo: number | null
  /** Data da votação mais recente (para "Última votação"). */
  ultimaVotacaoData: Date | string | null
}

export async function getEstatisticasGlobaisVotacoes(): Promise<EstatisticasGlobaisVotacoes> {
  return cached(
    'votacoes:stats_globais',
    TTL.votacoesStatsGlobais,
    async () => {
      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE ${votacao.aprovada} = true
              AND ${votacao.dataHora} > now() - interval '12 months'
          )::int AS aprovadas_12m,
          COUNT(*) FILTER (
            WHERE ${votacao.aprovada} = false
              AND ${votacao.dataHora} > now() - interval '12 months'
          )::int AS rejeitadas_12m,
          EXTRACT(YEAR FROM MIN(${votacao.dataHora}))::int AS ano_mais_antigo,
          MAX(${votacao.dataHora}) AS ultima_data
        FROM ${votacao}
      `)

      const row = result.rows[0]
      return {
        total: Number(row?.total ?? 0),
        aprovadas12m: Number(row?.aprovadas_12m ?? 0),
        rejeitadas12m: Number(row?.rejeitadas_12m ?? 0),
        anoMaisAntigo:
          row?.ano_mais_antigo != null ? Number(row.ano_mais_antigo) : null,
        ultimaVotacaoData: (row?.ultima_data as Date | string | null) ?? null,
      }
    },
  )
}
