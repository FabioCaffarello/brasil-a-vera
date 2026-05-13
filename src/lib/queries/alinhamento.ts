import { and, desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  ALINHAMENTO_AMOSTRA_MINIMA,
  calcularAlinhamento,
  classifyAlinhamento,
  type Orientacao,
  type Voto,
} from '@/modules/parlamentares/domain/alinhamento'
import { db } from '@/shared/db'
import {
  orientacao,
  parlamentar,
  votacao,
  votoNominal,
} from '@/shared/db/schema'

export interface VotacaoAlinhamento {
  votacaoId: string
  dataHora: Date | string
  descricao: string
  voto: Voto
  orientacao: Orientacao
}

export interface AlinhamentoResult {
  /** Partido atual do parlamentar (snapshot — não histórico). */
  partidoSigla: string | null
  /** % de alinhamento (0–100, arredondado). null se total = 0. */
  percentual: number | null
  /** Votos comparáveis (não LIBERADO + não AUSENTE). */
  total: number
  alinhados: number
  divergentes: number
  /** true se total < ALINHAMENTO_AMOSTRA_MINIMA — UI deve sinalizar. */
  amostraInsuficiente: boolean
  /** Top 5 divergiu — mais recentes primeiro. */
  topDivergencias: VotacaoAlinhamento[]
  /** Top 5 convergiu — mais recentes primeiro. */
  topConvergencias: VotacaoAlinhamento[]
}

const TOP_LIMIT = 5

const EMPTY: AlinhamentoResult = {
  partidoSigla: null,
  percentual: null,
  total: 0,
  alinhados: 0,
  divergentes: 0,
  amostraInsuficiente: true,
  topDivergencias: [],
  topConvergencias: [],
}

// Estratégia: cache de edge 24h (princípio 8 / ADR-018). Recalcula sob
// demanda no primeiro hit pós-expire. Cache invalida automaticamente após
// SCHEMA_VERSION ou BUILD_VERSION mudar — ver cache.ts.
//
// Cálculo: JOIN voto_nominal (parlamentar_id = X) × orientacao_bancada
// (mesmo votacao_id + partidoSigla do parlamentar). LIBERADO/AUSENTE
// filtrados em userland pela função pura calcularAlinhamento.
export async function getAlinhamentoParlamentar(
  parlamentarId: string,
): Promise<AlinhamentoResult> {
  return cached(
    `parlamentar:alinhamento:${parlamentarId}`,
    TTL.alinhamentoPartidario,
    async () => {
      const parlRows = await db
        .select({ partidoSigla: parlamentar.partidoSigla })
        .from(parlamentar)
        .where(eq(parlamentar.id, parlamentarId))
        .limit(1)
      const partidoSigla = parlRows[0]?.partidoSigla
      if (!partidoSigla) return EMPTY

      const rows = await db
        .select({
          votacaoId: votacao.id,
          dataHora: votacao.dataHora,
          descricao: votacao.descricao,
          voto: votoNominal.voto,
          orientacao: orientacao.orientacao,
        })
        .from(votoNominal)
        .innerJoin(
          orientacao,
          and(
            eq(orientacao.votacaoId, votoNominal.votacaoId),
            eq(orientacao.partidoSigla, partidoSigla),
          ),
        )
        .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
        .where(eq(votoNominal.parlamentarId, parlamentarId))
        .orderBy(desc(votacao.dataHora))

      const stats = calcularAlinhamento(
        rows.map((r) => ({ voto: r.voto as Voto, orientacao: r.orientacao })),
      )

      const topDivergencias: VotacaoAlinhamento[] = []
      const topConvergencias: VotacaoAlinhamento[] = []
      for (const r of rows) {
        if (
          topDivergencias.length >= TOP_LIMIT &&
          topConvergencias.length >= TOP_LIMIT
        ) {
          break
        }
        const c = classifyAlinhamento(r.voto as Voto, r.orientacao)
        if (c === 'DIVERGENTE' && topDivergencias.length < TOP_LIMIT) {
          topDivergencias.push({
            votacaoId: r.votacaoId,
            dataHora: r.dataHora,
            descricao: r.descricao,
            voto: r.voto as Voto,
            orientacao: r.orientacao,
          })
        } else if (c === 'ALINHADO' && topConvergencias.length < TOP_LIMIT) {
          topConvergencias.push({
            votacaoId: r.votacaoId,
            dataHora: r.dataHora,
            descricao: r.descricao,
            voto: r.voto as Voto,
            orientacao: r.orientacao,
          })
        }
      }

      return {
        partidoSigla,
        percentual: stats.percentual,
        total: stats.total,
        alinhados: stats.alinhados,
        divergentes: stats.divergentes,
        amostraInsuficiente: stats.total < ALINHAMENTO_AMOSTRA_MINIMA,
        topDivergencias,
        topConvergencias,
      }
    },
  )
}
