import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  type ConcordanciaPar,
  calcularConcordancias,
  type Voto,
  type VotoParlamentar,
} from '@/modules/parlamentares/domain/concordancia'
import { db } from '@/shared/db'
import {
  gasto,
  parlamentar,
  proposicaoAutor,
  votoNominal,
} from '@/shared/db/schema'

export interface ParlamentarComparar {
  id: string
  nome: string
  casa: 'CAMARA' | 'SENADO'
  partidoSigla: string
  uf: string
  urlFoto: string | null
}

export interface CategoriaGasto {
  categoriaDescricao: string
  total: string
  n: number
}

export interface MetricasParlamentar {
  parlamentarId: string
  /** % de presença = voto_nominal não-AUSENTE / total voto_nominal. null se sem votos. */
  presenca: {
    presente: number
    total: number
    percentual: number | null
  }
  gastosTotalGeral: string
  gastosTotalRegistros: number
  gastosTopCategorias: CategoriaGasto[]
  proposicoesAutoriaPrimaria: number
}

export interface CompararResult {
  parlamentares: ParlamentarComparar[]
  metricas: MetricasParlamentar[]
  /** Matriz par-a-par (3 pares se 3 parlamentares). */
  concordancia: ConcordanciaPar[]
  /** Ano usado para gastos. */
  ano: number
}

const MIN_IDS = 2
const MAX_IDS = 3
const TOP_CATEGORIAS = 3

// Retorna `null` em duas condições distintas (caller decide tratar como 4xx):
// - count de IDs únicos fora de [2, 3]
// - algum ID não corresponde a parlamentar existente no banco
//
// Cache key inclui ids ordenados (dedupe garantido), ano corrente.
// IDs com mesma combinação em ordem diferente compartilham cache hit.
export async function getCompararParlamentares(
  ids: string[],
): Promise<CompararResult | null> {
  const uniqueIds = Array.from(new Set(ids)).sort()
  if (uniqueIds.length < MIN_IDS || uniqueIds.length > MAX_IDS) return null

  const ano = new Date().getFullYear()

  return cached(
    `compare:${uniqueIds.join(',')}:ano=${ano}`,
    TTL.compararParlamentares,
    async () => {
      const parlamentares = await db
        .select({
          id: parlamentar.id,
          nome: parlamentar.nome,
          casa: parlamentar.casa,
          partidoSigla: parlamentar.partidoSigla,
          uf: parlamentar.uf,
          urlFoto: parlamentar.urlFoto,
        })
        .from(parlamentar)
        .where(inArray(parlamentar.id, uniqueIds))
        .orderBy(asc(parlamentar.id))

      // Falha rápido se algum ID não existe — caller mapeia pra 404/erro UI.
      if (parlamentares.length !== uniqueIds.length) return null

      // Fetch voto_nominal de todos os parlamentares em uma query.
      // Usado tanto para concordância par a par quanto para presença.
      const votos = await db
        .select({
          parlamentarId: votoNominal.parlamentarId,
          votacaoId: votoNominal.votacaoId,
          voto: votoNominal.voto,
        })
        .from(votoNominal)
        .where(inArray(votoNominal.parlamentarId, uniqueIds))

      const votosPorParlamentar = new Map<string, VotoParlamentar[]>()
      for (const id of uniqueIds) votosPorParlamentar.set(id, [])
      for (const v of votos) {
        votosPorParlamentar
          .get(v.parlamentarId)
          ?.push({ votacaoId: v.votacaoId, voto: v.voto as Voto })
      }

      const concordancia = calcularConcordancias(votosPorParlamentar)

      // Presença em userland (mesma collection já carregada).
      const presencaPorId = new Map<
        string,
        { presente: number; total: number }
      >()
      for (const id of uniqueIds)
        presencaPorId.set(id, { presente: 0, total: 0 })
      for (const v of votos) {
        const cur = presencaPorId.get(v.parlamentarId)
        if (!cur) continue
        cur.total++
        if (v.voto !== 'AUSENTE') cur.presente++
      }

      // Proposições autoria primária (AUTOR — não COAUTOR).
      const propsRows = await db
        .select({
          parlamentarId: proposicaoAutor.parlamentarId,
          total: sql<number>`COUNT(*)::int`,
        })
        .from(proposicaoAutor)
        .where(
          and(
            inArray(proposicaoAutor.parlamentarId, uniqueIds),
            eq(proposicaoAutor.tipoAutoria, 'AUTOR'),
          ),
        )
        .groupBy(proposicaoAutor.parlamentarId)

      const propsPorId = new Map<string, number>()
      for (const r of propsRows) {
        // parlamentarId é nullable na tabela mas inArray garante non-null aqui.
        if (r.parlamentarId) propsPorId.set(r.parlamentarId, Number(r.total))
      }

      // Gastos por parlamentar + categoria (ano corrente).
      const gastosRows = await db
        .select({
          parlamentarId: gasto.parlamentarId,
          categoriaDescricao: gasto.categoriaDescricao,
          total: sql<string | null>`SUM(${gasto.valor})`,
          n: sql<number>`COUNT(*)::int`,
        })
        .from(gasto)
        .where(
          and(
            inArray(gasto.parlamentarId, uniqueIds),
            sql`extract(year from ${gasto.dataEmissao}) = ${ano}`,
          ),
        )
        .groupBy(gasto.parlamentarId, gasto.categoriaDescricao)
        .orderBy(desc(sql`SUM(${gasto.valor})`))

      const gastosPorId = new Map<string, CategoriaGasto[]>()
      for (const id of uniqueIds) gastosPorId.set(id, [])
      for (const r of gastosRows) {
        gastosPorId.get(r.parlamentarId)?.push({
          categoriaDescricao: r.categoriaDescricao,
          total: r.total ?? '0',
          n: Number(r.n),
        })
      }

      const metricas: MetricasParlamentar[] = uniqueIds.map((id) => {
        const presenca = presencaPorId.get(id) ?? { presente: 0, total: 0 }
        const categorias = gastosPorId.get(id) ?? []
        let totalGeralCents = 0
        let totalRegistros = 0
        for (const c of categorias) {
          totalGeralCents += Math.round(Number(c.total) * 100)
          totalRegistros += c.n
        }
        return {
          parlamentarId: id,
          presenca: {
            presente: presenca.presente,
            total: presenca.total,
            percentual:
              presenca.total > 0
                ? Math.round((presenca.presente / presenca.total) * 100)
                : null,
          },
          gastosTotalGeral: (totalGeralCents / 100).toFixed(2),
          gastosTotalRegistros: totalRegistros,
          gastosTopCategorias: categorias.slice(0, TOP_CATEGORIAS),
          proposicoesAutoriaPrimaria: propsPorId.get(id) ?? 0,
        }
      })

      return {
        parlamentares,
        metricas,
        concordancia,
        ano,
      }
    },
  )
}
