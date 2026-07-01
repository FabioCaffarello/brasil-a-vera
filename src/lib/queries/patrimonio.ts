import { and, eq, inArray, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  buildEvolucao,
  type EvolucaoPatrimonial,
} from '@/modules/eleitoral/domain/evolucao'
import {
  buildGrafoParticipacao,
  CATEGORIAS_PARTICIPACAO,
  type GrafoParticipacao,
} from '@/modules/eleitoral/domain/grafo'
import {
  aggregatePatrimonio,
  type PatrimonioSnapshot,
} from '@/modules/eleitoral/domain/patrimonio'
import { db } from '@/shared/db'
import { tseBemCandidato, tseCandidatura } from '@/shared/db/schema'

// Eixo 2 — Camada A: snapshot patrimonial de um parlamentar a partir da
// declaração de bens da candidatura vinculada (ponte por CPF exato, L2).
// Pleitos ingeridos: 2014, 2018, 2022. Snapshot usa 2022 por padrão.
// Cobertura: Câmara 100% + Senado 88,9% (72/81). Os 9 suplentes restantes
// não têm registro TSE federal 2014–2022 (ver ADR-063); a seção some no
// perfil quando getPatrimonioSnapshot retorna null.
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

// Eixo 2 — Camada B: trajetória patrimonial do parlamentar entre os pleitos
// em que se candidatou (vínculo por CPF). Pontos discretos por pleito, nominal
// + corrigido por IPCA (ADR-036). null com < 2 pleitos (sem evolução a mostrar).
export async function getEvolucaoPatrimonial(
  parlamentarId: string,
): Promise<EvolucaoPatrimonial | null> {
  const key = `patrimonio:evolucao:${parlamentarId}`
  return cached(key, TTL.patrimonioDeclarado, async () => {
    const rows = await db
      .select({
        anoEleicao: tseBemCandidato.anoEleicao,
        cdTipoBem: tseBemCandidato.cdTipoBem,
        dsTipoBem: tseBemCandidato.dsTipoBem,
        total: sql<string>`SUM(${tseBemCandidato.valorDeclarado})`,
        n: sql<number>`COUNT(*)::int`,
      })
      .from(tseBemCandidato)
      .innerJoin(
        tseCandidatura,
        and(
          eq(tseCandidatura.anoEleicao, tseBemCandidato.anoEleicao),
          eq(tseCandidatura.sqCandidato, tseBemCandidato.sqCandidato),
        ),
      )
      .where(eq(tseCandidatura.parlamentarId, parlamentarId))
      .groupBy(
        tseBemCandidato.anoEleicao,
        tseBemCandidato.cdTipoBem,
        tseBemCandidato.dsTipoBem,
      )

    return buildEvolucao(rows)
  })
}

// Eixo 2 — Camada D: ego-grafo de participação societária do parlamentar
// (parlamentar central + empresas declaradas, qualquer pleito vinculado).
// Lê só os bens de participação (categorias 31/32/39); o CNPJ sai da descrição
// livre (extração determinística, L3 — ADR-037). null se não houver nenhum.
export async function getGrafoParticipacao(
  parlamentarId: string,
): Promise<GrafoParticipacao | null> {
  const key = `patrimonio:grafo:${parlamentarId}`
  return cached(key, TTL.patrimonioDeclarado, async () => {
    const rows = await db
      .select({
        anoEleicao: tseBemCandidato.anoEleicao,
        cdTipoBem: tseBemCandidato.cdTipoBem,
        dsTipoBem: tseBemCandidato.dsTipoBem,
        dsBem: tseBemCandidato.dsBem,
        valor: tseBemCandidato.valorDeclarado,
      })
      .from(tseBemCandidato)
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
          inArray(tseBemCandidato.cdTipoBem, [...CATEGORIAS_PARTICIPACAO]),
        ),
      )

    return buildGrafoParticipacao(rows)
  })
}
