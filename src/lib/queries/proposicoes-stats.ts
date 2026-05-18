import { eq, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  decideMediana,
  type MedianaTipo,
} from '@/modules/proposicoes/domain/mediana-amostra'
import { db } from '@/shared/db'
import {
  estatisticaProposicaoAgregada,
  proposicao,
  tramitacao,
} from '@/shared/db/schema'
import type { TipoProposicao } from './proposicoes'

// Re-export para consumers do query layer (script seed, UI) — evita que
// consumer precise saber a localização exata da regra no domínio.
export {
  decideMediana,
  type MedianaTipo,
  MIN_AMOSTRA_MEDIANA,
} from '@/modules/proposicoes/domain/mediana-amostra'

// ---------------------------------------------------------------------------
// Stats globais para o StatsGrid do hero da listagem /proposicoes
// (Wave 8 Sprint 8.1 PR1).
// ---------------------------------------------------------------------------

export interface EstatisticasGlobaisProposicoes {
  /** Total de proposições no banco (qualquer situação, qualquer época). */
  total: number
  /** Proposições com situacao = TRAMITANDO no momento da query. */
  tramitando: number
  /**
   * Proposições aprovadas (situacao IN APROVADA, TRANSFORMADA_EM_NORMA)
   * cujo último evento de tramitação caiu nos últimos 12 meses. Janela
   * temporal protege o stat de inflar com proposições históricas antigas
   * que estão como "APROVADA" desde 2003 — o usuário do hero quer ver
   * atividade recente, não acervo.
   */
  aprovadas12m: number
  /** Mesma lógica de aprovadas12m, mas para REJEITADA e ARQUIVADA. */
  rejeitadasArquivadas12m: number
}

export async function getEstatisticasGlobaisProposicoes(): Promise<EstatisticasGlobaisProposicoes> {
  return cached(
    'proposicoes:stats_globais',
    TTL.proposicoesStatsGlobais,
    async () => {
      // CTE `ultima_tramitacao`: data do evento mais recente por proposição.
      // Usado para filtrar "últimos 12 meses" sem precisar de subquery
      // correlated por linha. LEFT JOIN: proposição sem tramitação (recém
      // ingerida) não entra nas categorias 12m, mas conta no `total`.
      const result = await db.execute(sql`
        WITH ultima_tramitacao AS (
          SELECT proposicao_id, MAX(data) AS ultima
          FROM ${tramitacao}
          GROUP BY proposicao_id
        )
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE ${proposicao.situacao} = 'TRAMITANDO')::int AS tramitando,
          COUNT(*) FILTER (
            WHERE ${proposicao.situacao} IN ('APROVADA', 'TRANSFORMADA_EM_NORMA')
              AND ut.ultima > now() - interval '12 months'
          )::int AS aprovadas_12m,
          COUNT(*) FILTER (
            WHERE ${proposicao.situacao} IN ('REJEITADA', 'ARQUIVADA')
              AND ut.ultima > now() - interval '12 months'
          )::int AS rejeitadas_arquivadas_12m
        FROM ${proposicao}
        LEFT JOIN ultima_tramitacao ut ON ut.proposicao_id = ${proposicao.id}
      `)

      const row = result.rows[0]
      return {
        total: Number(row?.total ?? 0),
        tramitando: Number(row?.tramitando ?? 0),
        aprovadas12m: Number(row?.aprovadas_12m ?? 0),
        rejeitadasArquivadas12m: Number(row?.rejeitadas_arquivadas_12m ?? 0),
      }
    },
  )
}

// ---------------------------------------------------------------------------
// Mediana de dias em tramitação por tipoProposicao — usada pelo seed do
// Sprint 8.0 PR3 (script seed:agregados:proposicao) para popular a coluna
// `estatistica_proposicao_agregada.mediana_dias_tipo_referencia`. Esse valor
// alimenta o hint condicional do KpiStrip do detalhe (Sprint 8.2 PR1):
//   "287 dias em tramitação — vs mediana 412 dias para PL"
//
// Regra de threshold (MIN_AMOSTRA_MEDIANA, decideMediana) vive em
// src/modules/proposicoes/domain/mediana-amostra.ts (pura, sem dependência
// de DB) e é re-exportada acima para conveniência dos consumers.
// ---------------------------------------------------------------------------

/**
 * Mapa de tipo → estatística mediana. Chave presente = tipo tem proposições
 * com tramitação no banco. Valor `null` = amostra abaixo de MIN_AMOSTRA_MEDIANA
 * (não exibir comparação). Valor objeto = amostra suficiente, usar para
 * popular o agregado.
 *
 * Sem cache: chamado pelo seed (não pelo runtime do site). Adicionar cache
 * aqui seria YAGNI.
 */
export async function computeMedianaDiasPorTipo(): Promise<
  Map<TipoProposicao, MedianaTipo | null>
> {
  // CTE `dias_por_proposicao`: dias entre o 1º evento de tramitação
  // (proxy de apresentação) e hoje, por proposição. INNER JOIN: proposições
  // sem tramitação não entram na amostra (não temos como medir "dias em
  // tramitação" sem evento de origem).
  const result = await db.execute(sql`
    WITH dias_por_proposicao AS (
      SELECT
        ${proposicao.tipo} AS tipo,
        EXTRACT(EPOCH FROM (now() - MIN(${tramitacao.data}))) / 86400 AS dias
      FROM ${proposicao}
      INNER JOIN ${tramitacao} ON ${tramitacao.proposicaoId} = ${proposicao.id}
      GROUP BY ${proposicao.id}, ${proposicao.tipo}
    )
    SELECT
      tipo,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY dias)::int AS mediana,
      COUNT(*)::int AS amostra
    FROM dias_por_proposicao
    GROUP BY tipo
  `)

  const map = new Map<TipoProposicao, MedianaTipo | null>()
  for (const row of result.rows) {
    if (typeof row.tipo !== 'string') continue
    const tipo = row.tipo as TipoProposicao
    const amostra = Number(row.amostra ?? 0)
    const mediana = Number(row.mediana ?? 0)
    map.set(tipo, decideMediana(amostra, mediana))
  }
  return map
}

// ---------------------------------------------------------------------------
// Stats por proposição — consumido pelo KpiStrip v2 do detalhe
// (Wave 8 Sprint 8.2 PR1).
//
// Retorna a linha agregada inteira (ou null se a proposição não tem row
// na agregada — seed ainda não rodou ou row órfã). UI cai em fallback
// honesto (P2) quando null: cada slot mostra "dado indisponível" subtle
// em vez de números falsos.
// ---------------------------------------------------------------------------

export interface ProposicaoStats {
  diasEmTramitacao: number
  diasDesdeUltimaTramitacao: number | null
  nAutores: number
  nPartidosAutores: number
  nUfsAutores: number
  nVotacoes: number
  nVotacoesAprovadas: number
  nVotacoesRejeitadas: number
  nEventosTramitacao: number
  ultimoOrgao: string | null
  aprovadaEmAlgumaCasa: boolean
  medianaDiasTipoReferencia: number | null
  /** Tema com maior cardinalidade global entre os catalogados desta
   * proposição (pré-computado no PR3.5 do Sprint 8.0). Wave 8 Sprint
   * 8.2 PR5 usa para o footer cross-links "Outras proposições neste
   * tema". NULL quando proposição não tem tema catalogado. */
  temaCanonicoCodigo: number | null
}

export async function getProposicaoStats(
  proposicaoId: string,
): Promise<ProposicaoStats | null> {
  return cached(
    `proposicao:stats:${proposicaoId}`,
    TTL.proposicaoEmTramitacao,
    async () => {
      const rows = await db
        .select({
          diasEmTramitacao: estatisticaProposicaoAgregada.diasEmTramitacao,
          diasDesdeUltimaTramitacao:
            estatisticaProposicaoAgregada.diasDesdeUltimaTramitacao,
          nAutores: estatisticaProposicaoAgregada.nAutores,
          nPartidosAutores: estatisticaProposicaoAgregada.nPartidosAutores,
          nUfsAutores: estatisticaProposicaoAgregada.nUfsAutores,
          nVotacoes: estatisticaProposicaoAgregada.nVotacoes,
          nVotacoesAprovadas: estatisticaProposicaoAgregada.nVotacoesAprovadas,
          nVotacoesRejeitadas:
            estatisticaProposicaoAgregada.nVotacoesRejeitadas,
          nEventosTramitacao: estatisticaProposicaoAgregada.nEventosTramitacao,
          ultimoOrgao: estatisticaProposicaoAgregada.ultimoOrgao,
          aprovadaEmAlgumaCasa:
            estatisticaProposicaoAgregada.aprovadaEmAlgumaCasa,
          medianaDiasTipoReferencia:
            estatisticaProposicaoAgregada.medianaDiasTipoReferencia,
          temaCanonicoCodigo: estatisticaProposicaoAgregada.temaCanonicoCodigo,
        })
        .from(estatisticaProposicaoAgregada)
        .where(eq(estatisticaProposicaoAgregada.proposicaoId, proposicaoId))
        .limit(1)
      return rows[0] ?? null
    },
  )
}
