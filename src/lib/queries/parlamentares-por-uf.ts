import { and, asc, desc, eq, isNotNull, type SQL } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { estatisticaParlamentarAgregada, parlamentar } from '@/shared/db/schema'

// Núcleo compartilhado das queries "parlamentares federais de uma UF em
// exercício". Dois consumidores projetam exatamente as mesmas colunas com o
// mesmo LEFT JOIN no agregado:
//   - porta pública "Quem me representa" (getRepresentantesPorUf)
//   - sugestões "Da sua UF" do /painel (listRecomendacoesByUf)
// Mantê-las sobre uma fonte única garante que o filtro EXERCICIO e a projeção
// não saiam de sincronia — a query pública divergia (prometia "em exercício"
// na cópia da página sem aplicar o filtro). A lista-base é cacheada por UF e
// recortada em memória por cada consumidor (split por casa / exclusão de
// seguidos), compartilhando a mesma entrada quente de cache.

export interface ParlamentarUfRow {
  id: string
  nome: string
  casa: string
  partidoSigla: string
  uf: string
  urlFoto: string | null
  pctAlinhamento: string | null
  votacoesAnalisadas: number | null
}

export const parlamentarUfProjection = {
  id: parlamentar.id,
  nome: parlamentar.nome,
  casa: parlamentar.casa,
  partidoSigla: parlamentar.partidoSigla,
  uf: parlamentar.uf,
  urlFoto: parlamentar.urlFoto,
  pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
  votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
} as const

/**
 * Query-base (dinâmica) dos parlamentares em exercício de uma UF, já com o
 * LEFT JOIN do agregado. O caller encadeia `.orderBy`/`.limit` e decide cache.
 * `extra` permite predicados adicionais (ex.: `notInArray` de já-seguidos).
 */
export function selectParlamentaresEmExercicioPorUf(uf: string, extra?: SQL) {
  return db
    .select(parlamentarUfProjection)
    .from(parlamentar)
    .leftJoin(
      estatisticaParlamentarAgregada,
      eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
    )
    .where(
      and(
        eq(parlamentar.uf, uf),
        eq(parlamentar.situacaoMandato, 'EXERCICIO'),
        extra,
      ),
    )
    .$dynamic()
}

/**
 * Lista-base cacheada por UF: todos os parlamentares federais em exercício da
 * UF, ordenados por presença de agregado (com dado de alinhamento primeiro) e
 * depois nome. Determinística por UF → cache de edge (ADR-018, TTL de perfil).
 * Fonte única de getRepresentantesPorUf e listRecomendacoesByUf.
 */
export async function getParlamentaresEmExercicioPorUf(
  uf: string,
): Promise<ParlamentarUfRow[]> {
  return cached(
    `parlamentares-uf:exercicio:${uf}`,
    TTL.parlamentarPerfil,
    async () =>
      selectParlamentaresEmExercicioPorUf(uf).orderBy(
        desc(isNotNull(estatisticaParlamentarAgregada.pctAlinhamento)),
        asc(parlamentar.nome),
      ),
  )
}
