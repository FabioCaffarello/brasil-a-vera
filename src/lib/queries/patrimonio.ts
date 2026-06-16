import { and, eq, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  aggregatePatrimonio,
  type PatrimonioSnapshot,
} from '@/modules/eleitoral/domain/patrimonio'
import { db } from '@/shared/db'
import { tseBemCandidato, tseCandidatura } from '@/shared/db/schema'

// Eixo 2 — Camada A: snapshot patrimonial de um parlamentar a partir da
// declaração de bens da candidatura vinculada (ponte por CPF exato, L2).
// SOMENTE 2022 por ora (único pleito ingerido). Câmara-only na prática: só
// candidaturas com parlamentar_id (vínculo por CPF) entram — Senado não tem
// CPF, logo nunca vincula (a seção some no perfil).
//
// Cache de edge (ADR-018 / princípio 8): TTL.patrimonioDeclarado (24h).

const ANO_PADRAO = 2022

export async function getPatrimonioSnapshot(
  parlamentarId: string,
  anoEleicao: number = ANO_PADRAO,
): Promise<PatrimonioSnapshot | null> {
  const key = `patrimonio:snapshot:${parlamentarId}:${anoEleicao}`
  return cached(key, TTL.patrimonioDeclarado, async () => {
    // Agrega por categoria no SQL; a composição (%) e o total geral são
    // calculados na função pura aggregatePatrimonio (testável sem banco).
    const rows = await db
      .select({
        cdTipoBem: tseBemCandidato.cdTipoBem,
        dsTipoBem: tseBemCandidato.dsTipoBem,
        total: sql<string>`SUM(${tseBemCandidato.valorDeclarado})`,
        n: sql<number>`COUNT(*)::int`,
        ultDt: sql<string | null>`MAX(${tseBemCandidato.dtUltAtualizacao})`,
        sourceUrl: sql<string>`MIN(${tseBemCandidato.sourceUrl})`,
      })
      .from(tseBemCandidato)
      // Relação lógica bem↔candidatura por (ano, sq) — sem FK física.
      .innerJoin(
        tseCandidatura,
        and(
          eq(tseCandidatura.anoEleicao, tseBemCandidato.anoEleicao),
          eq(tseCandidatura.sqCandidato, tseBemCandidato.sqCandidato),
        ),
      )
      .where(
        and(
          eq(tseCandidatura.parlamentarId, parlamentarId),
          eq(tseBemCandidato.anoEleicao, anoEleicao),
        ),
      )
      .groupBy(tseBemCandidato.cdTipoBem, tseBemCandidato.dsTipoBem)

    return aggregatePatrimonio(rows, anoEleicao)
  })
}
