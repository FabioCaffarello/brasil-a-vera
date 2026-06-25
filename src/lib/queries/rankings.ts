import { and, desc, isNotNull, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { estatisticaParlamentarAgregada, parlamentar } from '@/shared/db/schema'

// Rankings de transparência (Sprint 16.0).
// Fonte: estatistica_parlamentar_agregada, atualizada pelo seed diário.
// Cache 24h (TTL.rankings) — mesmo horizonte do seed.

export interface RankingGastosEntry {
  id: string
  nome: string
  partidoSigla: string | null
  uf: string
  urlFoto: string | null
  casa: 'CAMARA' | 'SENADO'
  gastoTotalAno: string
  percentilGastoCasa: string | null
}

export interface RankingAlinhamentoEntry {
  id: string
  nome: string
  partidoSigla: string | null
  uf: string
  urlFoto: string | null
  casa: 'CAMARA' | 'SENADO'
  pctAlinhamento: string
  votacoesAnalisadas: number
}

// Top N por gasto CEAP (ano corrente). Ambas as casas — CEAP cobre Câmara e
// Senado (cota diferente, mas comparável dentro de cada casa).
export async function getRankingGastos(
  limit = 30,
): Promise<RankingGastosEntry[]> {
  return cached(`rankings:gastos:n=${limit}`, TTL.rankings, async () => {
    const rows = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        partidoSigla: parlamentar.partidoSigla,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        casa: parlamentar.casa,
        gastoTotalAno: estatisticaParlamentarAgregada.gastoTotalAno,
        percentilGastoCasa: estatisticaParlamentarAgregada.percentilGastoCasa,
      })
      .from(parlamentar)
      .innerJoin(
        estatisticaParlamentarAgregada,
        sql`${estatisticaParlamentarAgregada.parlamentarId} = ${parlamentar.id}`,
      )
      .where(isNotNull(estatisticaParlamentarAgregada.gastoTotalAno))
      .orderBy(desc(estatisticaParlamentarAgregada.gastoTotalAno))
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      partidoSigla: r.partidoSigla,
      uf: r.uf,
      urlFoto: r.urlFoto,
      casa: r.casa as 'CAMARA' | 'SENADO',
      gastoTotalAno: r.gastoTotalAno as string,
      percentilGastoCasa: r.percentilGastoCasa as string | null,
    }))
  })
}

// Top/bottom por alinhamento partidário. Requer votacoesAnalisadas >= 10
// para excluir parlamentares com amostra estatisticamente insignificante.
export async function getRankingAlinhamento(limit = 25): Promise<{
  disciplinados: RankingAlinhamentoEntry[]
  independentes: RankingAlinhamentoEntry[]
}> {
  return cached(`rankings:alinhamento:n=${limit}`, TTL.rankings, async () => {
    const MIN_VOTACOES = 10

    const baseWhere = and(
      isNotNull(estatisticaParlamentarAgregada.pctAlinhamento),
      sql`${estatisticaParlamentarAgregada.votacoesAnalisadas} >= ${MIN_VOTACOES}`,
    )

    const [disciplinados, independentes] = await Promise.all([
      db
        .select({
          id: parlamentar.id,
          nome: parlamentar.nome,
          partidoSigla: parlamentar.partidoSigla,
          uf: parlamentar.uf,
          urlFoto: parlamentar.urlFoto,
          casa: parlamentar.casa,
          pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
          votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
        })
        .from(parlamentar)
        .innerJoin(
          estatisticaParlamentarAgregada,
          sql`${estatisticaParlamentarAgregada.parlamentarId} = ${parlamentar.id}`,
        )
        .where(baseWhere)
        .orderBy(desc(estatisticaParlamentarAgregada.pctAlinhamento))
        .limit(limit),
      db
        .select({
          id: parlamentar.id,
          nome: parlamentar.nome,
          partidoSigla: parlamentar.partidoSigla,
          uf: parlamentar.uf,
          urlFoto: parlamentar.urlFoto,
          casa: parlamentar.casa,
          pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
          votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
        })
        .from(parlamentar)
        .innerJoin(
          estatisticaParlamentarAgregada,
          sql`${estatisticaParlamentarAgregada.parlamentarId} = ${parlamentar.id}`,
        )
        .where(baseWhere)
        .orderBy(
          sql`${estatisticaParlamentarAgregada.pctAlinhamento} ASC NULLS LAST`,
        )
        .limit(limit),
    ])

    const toEntry = (
      r: (typeof disciplinados)[number],
    ): RankingAlinhamentoEntry => ({
      id: r.id,
      nome: r.nome,
      partidoSigla: r.partidoSigla,
      uf: r.uf,
      urlFoto: r.urlFoto,
      casa: r.casa as 'CAMARA' | 'SENADO',
      pctAlinhamento: r.pctAlinhamento as string,
      votacoesAnalisadas: r.votacoesAnalisadas,
    })

    return {
      disciplinados: disciplinados.map(toEntry),
      independentes: independentes.map(toEntry),
    }
  })
}
