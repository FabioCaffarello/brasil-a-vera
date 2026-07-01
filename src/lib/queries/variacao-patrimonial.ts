import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'

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
// getter por parlamentar lê do mapa cacheado. Câmara 100% + Senado 88,9%
// (Sprint 39 — link tse_candidatura.parlamentar_id). Reusa IPCA do ADR-036.

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

export interface LeaderboardPatrimonioEntry {
  id: string
  nome: string
  partidoSigla: string | null
  uf: string
  urlFoto: string | null
  casa: 'CAMARA' | 'SENADO'
  variacao: VariacaoPatrimonial
}

// Retorna todos os parlamentares com variação patrimonial calculada, ordenados
// por deltaRealAbs decrescente (maiores ganhos primeiro). Reusa o ranking
// cacheado — custo marginal zero quando cache está quente.
export async function getLeaderboardPatrimonio(): Promise<
  LeaderboardPatrimonioEntry[]
> {
  return cached('patrimonio:leaderboard', TTL.patrimonioDeclarado, async () => {
    const ranking = await getVariacaoPatrimonialRanking()
    const ids = Object.keys(ranking)
    if (ids.length === 0) return []

    const parlamentares = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        partidoSigla: parlamentar.partidoSigla,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        casa: parlamentar.casa,
      })
      .from(parlamentar)
      .where(inArray(parlamentar.id, ids))

    return parlamentares
      .filter((p) => ranking[p.id] !== undefined)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        partidoSigla: p.partidoSigla,
        uf: p.uf,
        urlFoto: p.urlFoto,
        casa: p.casa as 'CAMARA' | 'SENADO',
        variacao: ranking[p.id],
      }))
      .sort(
        (a, b) =>
          parseFloat(b.variacao.deltaRealAbs) -
          parseFloat(a.variacao.deltaRealAbs),
      )
  })
}
