// Recomendações de parlamentares — Wave 10 Etapa 3.
//
// Bloco "Da sua UF — sugestões" no /painel (estados novo e maduro).
// Lista parlamentares da UF do usuário, ordenados por presença de
// agregado (parlamentares com mais dado primeiro) e excluindo os que
// o usuário já acompanha.
//
// Quando `uf` é null/undefined ou nenhum match: retorna []. UI decide
// o que mostrar (estado novo sem UF pede UF inline antes).

import { and, desc, eq, isNotNull, notInArray, sql } from 'drizzle-orm'

import {
  estatisticaParlamentarAgregada,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import { db } from '@/shared/db'

interface ListRecomendacoesInput {
  uf: string | null | undefined
  excludeParlamentarIds: string[]
  limit?: number
}

export async function listRecomendacoesByUf(input: ListRecomendacoesInput) {
  if (!input.uf) return []

  const limit = input.limit ?? 4
  const rows = await db
    .select({
      id: parlamentar.id,
      nome: parlamentar.nome,
      casa: parlamentar.casa,
      partidoSigla: parlamentar.partidoSigla,
      uf: parlamentar.uf,
      urlFoto: parlamentar.urlFoto,
      pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
      votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
    })
    .from(parlamentar)
    .leftJoin(
      estatisticaParlamentarAgregada,
      eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
    )
    .where(
      and(
        eq(parlamentar.uf, input.uf),
        eq(parlamentar.situacaoMandato, 'EXERCICIO'),
        // Exclui já acompanhados. Drizzle vazio array → vira `NOT IN ()` que
        // o Postgres rejeita; guardamos com early branch.
        input.excludeParlamentarIds.length > 0
          ? notInArray(parlamentar.id, input.excludeParlamentarIds)
          : undefined,
      ),
    )
    .orderBy(
      // Parlamentares com agregado primeiro (têm `pct_alinhamento != null`),
      // depois ordem alfabética estável.
      desc(isNotNull(estatisticaParlamentarAgregada.pctAlinhamento)),
      sql`${parlamentar.nome} ASC`,
    )
    .limit(limit)

  return rows
}
