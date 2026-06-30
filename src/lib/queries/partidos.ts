import { and, asc, desc, eq, gte, isNotNull, or, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { ALINHAMENTO_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/alinhamento'
import { db } from '@/shared/db'
import {
  estatisticaParlamentarAgregada,
  filiacaoPartidaria,
  gasto,
  parlamentar,
  proposicaoAutor,
  proposicaoTema,
} from '@/shared/db/schema'
import { federacaoDoPartido } from '@/shared/federacoes'

export interface PartidoMembro {
  id: string
  nome: string
  casa: 'CAMARA' | 'SENADO'
  uf: string
  urlFoto: string | null
}

export interface PartidoOverview {
  sigla: string
  /** Nome oficial inferido do membro mais comum; pode variar entre membros. */
  nomeOficial: string | null
  totalParlamentares: number
  parlamentares: PartidoMembro[]
}

export interface FidelidadeInternaMedia {
  /** Média simples de alinhamento dos membros elegíveis (≥50 votos comparáveis). null se nenhum elegível. */
  percentualMedio: number | null
  parlamentaresElegiveis: number
  parlamentaresTotal: number
  /**
   * true quando a sigla integra federação (ADR-041). A Câmara publica a
   * orientação de voto pela federação, não pela sigla — a fidelidade interna
   * pela sigla NÃO é calculada (é uma métrica mal-formada: não há orientação
   * da sigla contra a qual medir). Nenhum número é produzido; a UI explica.
   */
  emFederacao: boolean
  /** Nome da federação quando `emFederacao`; `null` caso contrário. */
  federacaoNome: string | null
}

export interface TemaContagem {
  nomeTema: string
  contagem: number
}

export interface GastoBancada {
  totalGeral: string
  totalRegistros: number
}

export async function getPartidoOverview(
  sigla: string,
): Promise<PartidoOverview> {
  return cached(`partido:overview:${sigla}`, TTL.partidoOverview, async () => {
    const rows = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        casa: parlamentar.casa,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        partidoNome: parlamentar.partidoNome,
      })
      .from(parlamentar)
      .where(eq(parlamentar.partidoSigla, sigla))
      .orderBy(asc(parlamentar.nome))

    // Nome oficial: pega o mais comum (membros da mesma sigla raramente
    // divergem mas a chave natural é sigla, não nome).
    const nomesCount = new Map<string, number>()
    for (const r of rows) {
      nomesCount.set(r.partidoNome, (nomesCount.get(r.partidoNome) ?? 0) + 1)
    }
    let nomeOficial: string | null = null
    let max = 0
    for (const [nome, count] of nomesCount) {
      if (count > max) {
        max = count
        nomeOficial = nome
      }
    }

    return {
      sigla,
      nomeOficial,
      totalParlamentares: rows.length,
      parlamentares: rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        casa: r.casa,
        uf: r.uf,
        urlFoto: r.urlFoto,
      })),
    }
  })
}

// Agrega via SQL — para cada parlamentar do partido, conta alinhados vs
// total (excluindo AUSENTE + LIBERADO). Tira média simples dos elegíveis
// (≥ ALINHAMENTO_AMOSTRA_MINIMA votos comparáveis).
//
// Casts via ::text porque tipoVoto e orientacaoBancada são enums distintos
// (não compartilham o mesmo type Postgres).
export async function getFidelidadeInternaMedia(
  sigla: string,
): Promise<FidelidadeInternaMedia> {
  return cached(
    `partido:fidelidade:${sigla}`,
    TTL.partidoOverview,
    async () => {
      // Federação (ADR-041): a Câmara publica orientação pela federação, não
      // pela sigla individual, então o join `ob.partido_sigla = p.partido_sigla`
      // abaixo colapsaria o denominador a ~0 para toda a bancada. Sinaliza e
      // suprime sem rodar o cálculo (sinalizar, não calcular). Não é amostra
      // insuficiente: não há orientação da sigla contra a qual medir.
      const federacao = federacaoDoPartido(sigla)
      if (federacao) {
        return {
          percentualMedio: null,
          parlamentaresElegiveis: 0,
          parlamentaresTotal: 0,
          emFederacao: true,
          federacaoNome: federacao.nome,
        }
      }

      const result = await db.execute(sql`
        WITH alinhamento_por_parlamentar AS (
          SELECT
            vn.parlamentar_id,
            COUNT(*) FILTER (
              WHERE vn.voto::text <> 'AUSENTE'
              AND ob.orientacao::text <> 'LIBERADO'
            )::int AS total,
            COUNT(*) FILTER (
              WHERE vn.voto::text <> 'AUSENTE'
              AND ob.orientacao::text <> 'LIBERADO'
              AND vn.voto::text = ob.orientacao::text
            )::int AS alinhados
          FROM votacoes.voto_nominal vn
          JOIN parlamentares.parlamentar p ON p.id = vn.parlamentar_id
          JOIN votacoes.orientacao_bancada ob
            ON ob.votacao_id = vn.votacao_id
            AND ob.partido_sigla = p.partido_sigla
          WHERE p.partido_sigla = ${sigla}
          GROUP BY vn.parlamentar_id
        )
        SELECT
          COUNT(*) FILTER (WHERE total >= ${ALINHAMENTO_AMOSTRA_MINIMA})::int AS elegiveis,
          COUNT(*)::int AS com_dados,
          AVG(
            CASE
              WHEN total >= ${ALINHAMENTO_AMOSTRA_MINIMA} AND total > 0
              THEN (alinhados::float / total::float) * 100
            END
          ) AS pct_medio
        FROM alinhamento_por_parlamentar
      `)

      const row = result.rows[0] as
        | { elegiveis: number; com_dados: number; pct_medio: number | null }
        | undefined

      if (!row) {
        return {
          percentualMedio: null,
          parlamentaresElegiveis: 0,
          parlamentaresTotal: 0,
          emFederacao: false,
          federacaoNome: null,
        }
      }

      return {
        percentualMedio:
          row.pct_medio === null ? null : Math.round(Number(row.pct_medio)),
        parlamentaresElegiveis: row.elegiveis,
        parlamentaresTotal: row.com_dados,
        emFederacao: false,
        federacaoNome: null,
      }
    },
  )
}

export async function getTop5TemasPartido(
  sigla: string,
): Promise<TemaContagem[]> {
  return cached(`partido:temas:${sigla}`, TTL.partidoOverview, async () => {
    const rows = await db
      .select({
        nomeTema: proposicaoTema.nomeTema,
        contagem: sql<number>`COUNT(*)::int`,
      })
      .from(proposicaoAutor)
      .innerJoin(parlamentar, eq(parlamentar.id, proposicaoAutor.parlamentarId))
      .innerJoin(
        proposicaoTema,
        eq(proposicaoTema.proposicaoId, proposicaoAutor.proposicaoId),
      )
      .where(eq(parlamentar.partidoSigla, sigla))
      .groupBy(proposicaoTema.nomeTema)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5)

    return rows.map((r) => ({
      nomeTema: r.nomeTema,
      contagem: Number(r.contagem),
    }))
  })
}

export async function getGastoBancadaAno(
  sigla: string,
  ano: number,
): Promise<GastoBancada> {
  return cached(
    `partido:gasto:${sigla}:${ano}`,
    TTL.partidoOverview,
    async () => {
      const result = await db
        .select({
          total: sql<string | null>`SUM(${gasto.valor})`,
          n: sql<number>`COUNT(*)::int`,
        })
        .from(gasto)
        .innerJoin(parlamentar, eq(parlamentar.id, gasto.parlamentarId))
        .where(
          and(
            eq(parlamentar.partidoSigla, sigla),
            sql`extract(year from ${gasto.dataEmissao}) = ${ano}`,
          ),
        )

      const row = result[0]
      const totalStr = row?.total ?? '0'
      // numeric retorna string; manter como string pra precisão de centavos.
      return {
        totalGeral: Number(totalStr).toFixed(2),
        totalRegistros: Number(row?.n ?? 0),
      }
    },
  )
}

export interface GastoCategoriasBancada {
  categorias: { descricao: string; total: string }[]
}

export async function getGastoCategoriasBancada(
  sigla: string,
  ano: number,
): Promise<GastoCategoriasBancada> {
  return cached(
    `partido:gasto-categorias:${sigla}:${ano}`,
    TTL.partidoOverview,
    async () => {
      const rows = await db
        .select({
          descricao: gasto.categoriaDescricao,
          total: sql<string>`SUM(${gasto.valor})`,
        })
        .from(gasto)
        .innerJoin(parlamentar, eq(parlamentar.id, gasto.parlamentarId))
        .where(
          and(
            eq(parlamentar.partidoSigla, sigla),
            sql`extract(year from ${gasto.dataEmissao}) = ${ano}`,
          ),
        )
        .groupBy(gasto.categoriaDescricao)
        .orderBy(desc(sql`SUM(${gasto.valor})`))
        .limit(5)

      return {
        categorias: rows.map((r) => ({
          descricao: r.descricao,
          total: Number(r.total ?? 0).toFixed(2),
        })),
      }
    },
  )
}

export interface AlinhamentoMedioBancada {
  /** Média de pct_alinhamento dos membros com ≥ 10 votações analisadas. null se nenhum elegível. */
  percentualMedio: number | null
  /** Membros com dados suficientes (≥ 10 votações). */
  comDados: number
}

// Média de alinhamento partidário da bancada via estatistica_parlamentar_agregada.
// Distinto de getFidelidadeInternaMedia (que mede alinhamento à orientação de bancada
// via voto_nominal join orientacao_bancada). Este usa o campo pré-computado.
export async function getAlinhamentoMedioBancada(
  sigla: string,
): Promise<AlinhamentoMedioBancada> {
  return cached(
    `partido:alinhamento-medio:${sigla}`,
    TTL.rankings,
    async () => {
      const MIN_VOTACOES = 10
      const rows = await db
        .select({
          avgAlinhamento: sql<
            string | null
          >`AVG(${estatisticaParlamentarAgregada.pctAlinhamento})`,
          comDados: sql<number>`COUNT(*)::int`,
        })
        .from(parlamentar)
        .innerJoin(
          estatisticaParlamentarAgregada,
          eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
        )
        .where(
          and(
            eq(parlamentar.partidoSigla, sigla),
            isNotNull(estatisticaParlamentarAgregada.pctAlinhamento),
            sql`${estatisticaParlamentarAgregada.votacoesAnalisadas} >= ${MIN_VOTACOES}`,
          ),
        )

      const row = rows[0]
      return {
        percentualMedio:
          row?.avgAlinhamento != null
            ? Math.round(parseFloat(row.avgAlinhamento) * 10) / 10
            : null,
        comDados: Number(row?.comDados ?? 0),
      }
    },
  )
}

// ── Movimentações recentes ────────────────────────────────────────────────────

export interface FiliacaoMovimentacao {
  parlamentarId: string
  parlamentarNome: string
  parlamentarCasa: 'CAMARA' | 'SENADO'
  parlamentarUf: string
  parlamentarUrlFoto: string | null
  tipo: 'ENTRADA' | 'SAIDA'
  data: string
}

// Retorna entradas e saídas recentes (~365 dias) de parlamentares neste partido.
// Condicional: retorna [] quando filiacao_partidaria está vazia (graceful
// degradation enquanto a ingestão ainda não rodou em prod).
export async function getFiliacoesRecentes(
  sigla: string,
  limit = 10,
): Promise<FiliacaoMovimentacao[]> {
  return cached(
    `partido:filiacoes-recentes:${sigla}:n=${limit}`,
    TTL.partidoOverview,
    async () => {
      const corte = sql`NOW() - INTERVAL '365 days'`

      const entradas = await db
        .select({
          parlamentarId: parlamentar.id,
          parlamentarNome: parlamentar.nome,
          parlamentarCasa: parlamentar.casa,
          parlamentarUf: parlamentar.uf,
          parlamentarUrlFoto: parlamentar.urlFoto,
          data: filiacaoPartidaria.dataInicio,
        })
        .from(filiacaoPartidaria)
        .innerJoin(
          parlamentar,
          eq(parlamentar.id, filiacaoPartidaria.parlamentarId),
        )
        .where(
          and(
            eq(filiacaoPartidaria.partidoSigla, sigla),
            gte(filiacaoPartidaria.dataInicio, sql`${corte}::date`),
          ),
        )
        .orderBy(desc(filiacaoPartidaria.dataInicio))
        .limit(limit)

      const saidas = await db
        .select({
          parlamentarId: parlamentar.id,
          parlamentarNome: parlamentar.nome,
          parlamentarCasa: parlamentar.casa,
          parlamentarUf: parlamentar.uf,
          parlamentarUrlFoto: parlamentar.urlFoto,
          data: filiacaoPartidaria.dataFim,
        })
        .from(filiacaoPartidaria)
        .innerJoin(
          parlamentar,
          eq(parlamentar.id, filiacaoPartidaria.parlamentarId),
        )
        .where(
          and(
            eq(filiacaoPartidaria.partidoSigla, sigla),
            or(
              gte(filiacaoPartidaria.dataFim, sql`${corte}::date`),
              isNotNull(filiacaoPartidaria.dataFim),
            ),
            gte(filiacaoPartidaria.dataFim, sql`${corte}::date`),
          ),
        )
        .orderBy(desc(filiacaoPartidaria.dataFim))
        .limit(limit)

      const resultado: FiliacaoMovimentacao[] = [
        ...entradas.map((r) => ({
          parlamentarId: r.parlamentarId,
          parlamentarNome: r.parlamentarNome,
          parlamentarCasa: r.parlamentarCasa as 'CAMARA' | 'SENADO',
          parlamentarUf: r.parlamentarUf,
          parlamentarUrlFoto: r.parlamentarUrlFoto,
          tipo: 'ENTRADA' as const,
          data: r.data,
        })),
        ...saidas
          .filter((r) => r.data != null)
          .map((r) => ({
            parlamentarId: r.parlamentarId,
            parlamentarNome: r.parlamentarNome,
            parlamentarCasa: r.parlamentarCasa as 'CAMARA' | 'SENADO',
            parlamentarUf: r.parlamentarUf,
            parlamentarUrlFoto: r.parlamentarUrlFoto,
            tipo: 'SAIDA' as const,
            data: r.data as string,
          })),
      ]

      resultado.sort((a, b) => b.data.localeCompare(a.data))
      return resultado.slice(0, limit)
    },
  )
}
