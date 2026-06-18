import { and, asc, desc, eq, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { ALINHAMENTO_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/alinhamento'
import { db } from '@/shared/db'
import {
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
