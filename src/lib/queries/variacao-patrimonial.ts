import { and, eq, isNotNull, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  type BemPorPleito,
  calcularVariacaoRanking,
  type VariacaoPatrimonial,
} from '@/modules/eleitoral/domain/variacao-patrimonial'
import { db } from '@/shared/db'
import {
  parlamentar,
  tseBemCandidato,
  tseCandidatura,
} from '@/shared/db/schema'

// Variação patrimonial real durante o mandato + percentil vs pares (ADR-047).
//
// O percentil precisa de TODOS os pares, então o ranking é computado uma vez
// (sobre ~372 parlamentares com bens vinculados) e cacheado 24h (ADR-018); o
// getter por parlamentar lê do mapa cacheado. Câmara-only na prática (Senado
// sem CPF → sem vínculo TSE). Reusa a correção IPCA do ADR-036.

export type { VariacaoPatrimonial }

async function computeRanking(): Promise<Record<string, VariacaoPatrimonial>> {
  const rows = await db
    .select({
      parlamentarId: tseCandidatura.parlamentarId,
      casa: parlamentar.casa,
      anoEleicao: tseBemCandidato.anoEleicao,
      totalNominal: sql<string>`SUM(${tseBemCandidato.valorDeclarado})`,
    })
    .from(tseBemCandidato)
    .innerJoin(
      tseCandidatura,
      and(
        eq(tseCandidatura.anoEleicao, tseBemCandidato.anoEleicao),
        eq(tseCandidatura.sqCandidato, tseBemCandidato.sqCandidato),
      ),
    )
    .innerJoin(parlamentar, eq(parlamentar.id, tseCandidatura.parlamentarId))
    .where(isNotNull(tseCandidatura.parlamentarId))
    .groupBy(
      tseCandidatura.parlamentarId,
      parlamentar.casa,
      tseBemCandidato.anoEleicao,
    )

  const bens: BemPorPleito[] = []
  for (const r of rows) {
    if (r.parlamentarId) {
      bens.push({
        parlamentarId: r.parlamentarId,
        casa: r.casa,
        anoEleicao: r.anoEleicao,
        totalNominal: r.totalNominal,
      })
    }
  }

  return Object.fromEntries(calcularVariacaoRanking(bens))
}

export async function getVariacaoPatrimonialRanking(): Promise<
  Record<string, VariacaoPatrimonial>
> {
  return cached(
    'patrimonio:variacao-ranking',
    TTL.patrimonioDeclarado,
    computeRanking,
  )
}

export async function getVariacaoPatrimonial(
  parlamentarId: string,
): Promise<VariacaoPatrimonial | null> {
  const ranking = await getVariacaoPatrimonialRanking()
  return ranking[parlamentarId] ?? null
}
