import { and, desc, eq, inArray } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  ALINHAMENTO_AMOSTRA_MINIMA,
  agruparAlinhamentoBlocos,
  calcularAlinhamento,
  classifyAlinhamento,
  type EventoBloco,
  type Orientacao,
  type Voto,
} from '@/modules/parlamentares/domain/alinhamento'
import { db } from '@/shared/db'
import {
  blocoPartidario,
  orientacao,
  parlamentar,
  votacao,
  votoNominal,
} from '@/shared/db/schema'
import { federacaoDoPartido } from '@/shared/federacoes'

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
  /**
   * true quando o partido integra federação (ADR-041). A Câmara publica
   * orientação pela federação, não pela sigla — o alinhamento partidário
   * pela sigla NÃO é calculado. Nenhum número é exibido; a UI explica o motivo.
   */
  emFederacao: boolean
  /** Nome da federação quando `emFederacao`; `null` caso contrário. */
  federacaoNome: string | null
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
  emFederacao: false,
  federacaoNome: null,
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

      // Federação (ADR-041): a Câmara publica orientação pela federação, não
      // pela sigla individual, então o join abaixo colapsaria o denominador a
      // ~0. Sinaliza e suprime sem rodar o cálculo — robusto aos três casos
      // (denominador 0, esparso 1–49 ou ≥50): nenhum número é produzido.
      const federacao = federacaoDoPartido(partidoSigla)
      if (federacao) {
        return {
          ...EMPTY,
          partidoSigla,
          emFederacao: true,
          federacaoNome: federacao.nome,
        }
      }

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
        emFederacao: false,
        federacaoNome: null,
        topDivergencias,
        topConvergencias,
      }
    },
  )
}

// Blocos institucionais expostos na UI (ADR-040): Governo e Oposição.
// Maioria/Minoria são ingeridos/persistidos mas não renderizados nesta versão.
const BLOCOS_EXPOSTOS = ['Governo', 'Oposição'] as const

// Quantas votações listar por bloco (amostra factual "quais votações").
const BLOCO_VOTACOES_LIMIT = 8

export interface VotacaoBlocoResult {
  votacaoId: string
  dataHora: Date | string
  descricao: string
  voto: Voto
  orientacao: Orientacao
  classificacao: 'ALINHADO' | 'DIVERGENTE'
}

export interface BlocoAlinhamentoResult {
  /** Nome do bloco institucional ('Governo' | 'Oposição'). */
  bloco: string
  total: number
  alinhados: number
  divergentes: number
  amostraInsuficiente: boolean
  votacoes: VotacaoBlocoResult[]
}

// Alinhamento do voto individual vs. orientação dos blocos institucionais
// (Governo/Oposição). Independe do partido do parlamentar — join por
// tipo_lideranca = 'B'. Câmara-only por natureza da fonte (ADR-040). Mesmo
// regime de cache do alinhamento partidário (princípio 8 / ADR-018).
export async function getAlinhamentoBlocos(
  parlamentarId: string,
): Promise<BlocoAlinhamentoResult[]> {
  return cached(
    `parlamentar:alinhamento-blocos:${parlamentarId}`,
    TTL.alinhamentoPartidario,
    async () => {
      const rows = await db
        .select({
          bloco: orientacao.partidoSigla,
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
            eq(orientacao.tipoLideranca, 'B'),
            inArray(orientacao.partidoSigla, [...BLOCOS_EXPOSTOS]),
          ),
        )
        .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
        .where(eq(votoNominal.parlamentarId, parlamentarId))
        .orderBy(desc(votacao.dataHora))

      const eventos: EventoBloco<{
        votacaoId: string
        dataHora: Date | string
        descricao: string
      }>[] = rows.map((r) => ({
        bloco: r.bloco,
        voto: r.voto as Voto,
        orientacao: r.orientacao,
        votacao: {
          votacaoId: r.votacaoId,
          dataHora: r.dataHora,
          descricao: r.descricao,
        },
      }))

      const agregados = agruparAlinhamentoBlocos(
        eventos,
        BLOCOS_EXPOSTOS,
        BLOCO_VOTACOES_LIMIT,
      )

      return agregados.map((a) => ({
        bloco: a.bloco,
        total: a.total,
        alinhados: a.alinhados,
        divergentes: a.divergentes,
        amostraInsuficiente: a.amostraInsuficiente,
        votacoes: a.votacoes.map((v) => ({
          votacaoId: v.votacao.votacaoId,
          dataHora: v.votacao.dataHora,
          descricao: v.votacao.descricao,
          voto: v.voto,
          orientacao: v.orientacao,
          classificacao: v.classificacao,
        })),
      }))
    },
  )
}

export interface BlocoComposicao {
  nome: string
  partidos: string[]
}

// Composição dos blocos Gov/Oposição por casa — campo `partidos text[]`
// ingerido mas nunca exposto na UI até Sprint 26.
export async function getBlocosComposicao(
  casa: 'CAMARA' | 'SENADO',
): Promise<BlocoComposicao[]> {
  return cached(
    `blocos:composicao:${casa}`,
    TTL.alinhamentoPartidario,
    async () => {
      const rows = await db
        .select({
          nome: blocoPartidario.nome,
          partidos: blocoPartidario.partidos,
        })
        .from(blocoPartidario)
        .where(eq(blocoPartidario.casa, casa))
        .orderBy(blocoPartidario.nome)
      return rows.map((r) => ({ nome: r.nome, partidos: r.partidos }))
    },
  )
}
