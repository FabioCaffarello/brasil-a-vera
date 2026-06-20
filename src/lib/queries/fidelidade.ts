import { asc, eq, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import {
  ALINHAMENTO_AMOSTRA_MINIMA,
  type AlinhamentoStats,
  calcularAlinhamento,
  classifyAlinhamento,
  type Orientacao,
  type Voto,
} from '@/modules/parlamentares/domain/alinhamento'
import {
  calcularFidelidadeBancada,
  classificarVsBancada,
  construirTimelineMigracao,
  type FidelidadeStats,
  posicaoBancada,
  type TimelineMigracao,
} from '@/modules/parlamentares/domain/fidelidade'
import { db } from '@/shared/db'
import { filiacaoPartidaria } from '@/shared/db/schema'

// Confronto de fidelidade partidária (Eixo 1, ADR-043). Camada de dados.
//
// Duas definições de "o partido", retornadas por funções SEPARADAS (D1):
//   - getFidelidadeOrientacao → orientação declarada da liderança (L1);
//   - getFidelidadeBancada    → maioria derivada da bancada (L2).
// Ambas medem o voto contra o partido VIGENTE NA DATA DO VOTO (D3),
// reconstruído de filiacao_partidaria — não contra um partido fixo.
//
// A reconstrução as-of e o recorte da bancada vivem em SQL bruto (CTE com
// self-joins e aliases, que as refs de coluna do Drizzle não expressam). Os
// nomes schema.tabela são estáveis (ADR-013). Validado empiricamente contra
// Postgres local (PSB/Senado: bench=7, 39/145 votações com quórum) — princípio
// 13. Cache de edge 24h (ADR-018); recálculo sob demanda no primeiro miss.

const TOP_LIMIT = 5

// CTE comum: votações do parlamentar com o partido vigente na data de cada
// voto. HAVING count(distinct sigla)=1 é o fail-closed do D3 — exclui datas
// ambíguas (períodos sobrepostos com siglas diferentes); o INNER JOIN exclui
// datas sem cobertura (lacuna). Espelha partidoVigenteEm() do domínio.
// `parlamentarId` entra como bind parametrizado (sem interpolação crua).
function meusCte(parlamentarId: string) {
  return sql`
    meus AS (
      SELECT vn.votacao_id,
             v.data_hora::date AS d,
             v.casa,
             v.data_hora,
             v.descricao,
             vn.voto AS p_voto,
             max(f.partido_sigla) AS party
      FROM votacoes.voto_nominal vn
      JOIN votacoes.votacao v ON v.id = vn.votacao_id
      JOIN parlamentares.filiacao_partidaria f
        ON f.parlamentar_id = vn.parlamentar_id
       AND f.data_inicio <= v.data_hora::date
       AND (f.data_fim IS NULL OR v.data_hora::date <= f.data_fim)
      WHERE vn.parlamentar_id = ${parlamentarId}
      GROUP BY vn.votacao_id, v.data_hora, v.casa, v.descricao, vn.voto
      HAVING count(DISTINCT f.partido_sigla) = 1
    )
  `
}

// ── L2: maioria derivada da bancada ──────────────────────────────────────────

export interface FidelidadeVotacao {
  votacaoId: string
  dataHora: Date | string
  descricao: string
  /** Partido vigente na data do voto (as-of). */
  party: string
  voto: Voto
}

export interface FidelidadeBancadaResult {
  stats: FidelidadeStats
  /** true se total comparável < ALINHAMENTO_AMOSTRA_MINIMA — UI sinaliza. */
  amostraInsuficiente: boolean
  topDivergencias: FidelidadeVotacao[]
  topConvergencias: FidelidadeVotacao[]
}

const EMPTY_BANCADA: FidelidadeBancadaResult = {
  stats: { total: 0, alinhados: 0, divergentes: 0, percentual: null },
  amostraInsuficiente: true,
  topDivergencias: [],
  topConvergencias: [],
}

interface BancadaRow extends VotacaoRowBase {
  sim: number | string
  nao: number | string
  total: number | string
}

export async function getFidelidadeBancada(
  parlamentarId: string,
): Promise<FidelidadeBancadaResult> {
  return cached(
    `parlamentar:fidelidade:bancada:${parlamentarId}`,
    TTL.alinhamentoPartidario,
    async () => {
      // sim/nao da bancada (membros com voto válido) + total de membros na data.
      // count(DISTINCT parlamentar) deduplica períodos da mesma sigla.
      const query = sql`
        WITH ${meusCte(parlamentarId)},
        bench_votes AS (
          SELECT m.votacao_id,
                 count(DISTINCT bvn.parlamentar_id) FILTER (WHERE bvn.voto = 'SIM') AS sim,
                 count(DISTINCT bvn.parlamentar_id) FILTER (WHERE bvn.voto = 'NAO') AS nao
          FROM meus m
          JOIN votacoes.voto_nominal bvn ON bvn.votacao_id = m.votacao_id
          JOIN parlamentares.filiacao_partidaria bf
            ON bf.parlamentar_id = bvn.parlamentar_id
           AND bf.partido_sigla = m.party
           AND bf.data_inicio <= m.d
           AND (bf.data_fim IS NULL OR m.d <= bf.data_fim)
          GROUP BY m.votacao_id
        ),
        bench_size AS (
          SELECT m.votacao_id, count(DISTINCT pp.id) AS total
          FROM meus m
          JOIN parlamentares.parlamentar pp ON pp.casa = m.casa
          JOIN parlamentares.filiacao_partidaria bf
            ON bf.parlamentar_id = pp.id
           AND bf.partido_sigla = m.party
           AND bf.data_inicio <= m.d
           AND (bf.data_fim IS NULL OR m.d <= bf.data_fim)
          GROUP BY m.votacao_id
        )
        SELECT m.votacao_id, m.data_hora, m.descricao, m.party, m.p_voto,
               coalesce(bv.sim, 0) AS sim,
               coalesce(bv.nao, 0) AS nao,
               coalesce(bs.total, 0) AS total
        FROM meus m
        LEFT JOIN bench_votes bv ON bv.votacao_id = m.votacao_id
        LEFT JOIN bench_size bs ON bs.votacao_id = m.votacao_id
        ORDER BY m.data_hora DESC
      `
      const result = await db.execute(query)
      const rows = result.rows as unknown as BancadaRow[]
      if (rows.length === 0) return EMPTY_BANCADA

      const eventos = rows.map((r) => ({
        voto: r.p_voto as Voto,
        posicao: posicaoBancada({
          sim: Number(r.sim),
          nao: Number(r.nao),
          totalMembros: Number(r.total),
        }),
      }))
      const stats = calcularFidelidadeBancada(eventos)

      const topDivergencias: FidelidadeVotacao[] = []
      const topConvergencias: FidelidadeVotacao[] = []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (!r) continue
        const classe = classificarVsBancada(
          r.p_voto as Voto,
          eventos[i]?.posicao ?? 'INDEFINIDA',
        )
        if (classe === 'DIVERGENTE' && topDivergencias.length < TOP_LIMIT) {
          topDivergencias.push(toVotacao(r))
        } else if (
          classe === 'ALINHADO' &&
          topConvergencias.length < TOP_LIMIT
        ) {
          topConvergencias.push(toVotacao(r))
        }
      }

      return {
        stats,
        amostraInsuficiente: stats.total < ALINHAMENTO_AMOSTRA_MINIMA,
        topDivergencias,
        topConvergencias,
      }
    },
  )
}

// Campos comuns às duas linhas (bancada e orientação) — evita cast entre elas.
interface VotacaoRowBase {
  votacao_id: string
  data_hora: Date | string
  descricao: string
  party: string
  p_voto: string
}

function toVotacao(r: VotacaoRowBase): FidelidadeVotacao {
  return {
    votacaoId: r.votacao_id,
    dataHora: r.data_hora,
    descricao: r.descricao,
    party: r.party,
    voto: r.p_voto as Voto,
  }
}

// ── L1: orientação declarada da liderança (as-of) ────────────────────────────

export interface FidelidadeOrientacaoVotacao extends FidelidadeVotacao {
  orientacao: Orientacao
}

export interface FidelidadeOrientacaoResult {
  stats: AlinhamentoStats
  amostraInsuficiente: boolean
  topDivergencias: FidelidadeOrientacaoVotacao[]
  topConvergencias: FidelidadeOrientacaoVotacao[]
}

const EMPTY_ORIENTACAO: FidelidadeOrientacaoResult = {
  stats: { total: 0, alinhados: 0, divergentes: 0, percentual: null },
  amostraInsuficiente: true,
  topDivergencias: [],
  topConvergencias: [],
}

interface OrientacaoRow extends VotacaoRowBase {
  orientacao: string
}

export async function getFidelidadeOrientacao(
  parlamentarId: string,
): Promise<FidelidadeOrientacaoResult> {
  return cached(
    `parlamentar:fidelidade:orientacao:${parlamentarId}`,
    TTL.alinhamentoPartidario,
    async () => {
      // Junta orientação de PARTIDO (tipo_lideranca='P') do partido vigente na
      // data. Diferente de getAlinhamentoParlamentar, que casa pela sigla ATUAL.
      const query = sql`
        WITH ${meusCte(parlamentarId)}
        SELECT m.votacao_id, m.data_hora, m.descricao, m.party, m.p_voto,
               o.orientacao
        FROM meus m
        JOIN votacoes.orientacao_bancada o
          ON o.votacao_id = m.votacao_id
         AND o.partido_sigla = m.party
         AND o.tipo_lideranca = 'P'
        ORDER BY m.data_hora DESC
      `
      const result = await db.execute(query)
      const rows = result.rows as unknown as OrientacaoRow[]
      if (rows.length === 0) return EMPTY_ORIENTACAO

      const stats = calcularAlinhamento(
        rows.map((r) => ({
          voto: r.p_voto as Voto,
          orientacao: r.orientacao as Orientacao,
        })),
      )

      const topDivergencias: FidelidadeOrientacaoVotacao[] = []
      const topConvergencias: FidelidadeOrientacaoVotacao[] = []
      for (const r of rows) {
        const classe = classifyAlinhamento(
          r.p_voto as Voto,
          r.orientacao as Orientacao,
        )
        const item: FidelidadeOrientacaoVotacao = {
          ...toVotacao(r),
          orientacao: r.orientacao as Orientacao,
        }
        if (classe === 'DIVERGENTE' && topDivergencias.length < TOP_LIMIT) {
          topDivergencias.push(item)
        } else if (
          classe === 'ALINHADO' &&
          topConvergencias.length < TOP_LIMIT
        ) {
          topConvergencias.push(item)
        }
      }

      return {
        stats,
        amostraInsuficiente: stats.total < ALINHAMENTO_AMOSTRA_MINIMA,
        topDivergencias,
        topConvergencias,
      }
    },
  )
}

// ── Timeline de migração partidária (L1, D3) ─────────────────────────────────

export async function getTimelineMigracao(
  parlamentarId: string,
): Promise<TimelineMigracao> {
  return cached(
    `parlamentar:fidelidade:timeline:${parlamentarId}`,
    TTL.filiacaoHistorica,
    async () => {
      const rows = await db
        .select({
          partidoSigla: filiacaoPartidaria.partidoSigla,
          dataInicio: filiacaoPartidaria.dataInicio,
          dataFim: filiacaoPartidaria.dataFim,
        })
        .from(filiacaoPartidaria)
        .where(eq(filiacaoPartidaria.parlamentarId, parlamentarId))
        .orderBy(asc(filiacaoPartidaria.dataInicio))
      return construirTimelineMigracao(rows)
    },
  )
}
