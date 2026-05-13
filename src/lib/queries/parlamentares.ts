import { and, count, desc, eq, sql, sum } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
  gasto,
  parlamentar,
  proposicao,
  proposicaoAutor,
  votacao,
  votoNominal,
} from '@/shared/db/schema'

export type Casa = 'CAMARA' | 'SENADO'

export interface FiltrosParlamentar {
  casa?: Casa
  partido?: string
  uf?: string
}

export async function listParlamentares(filtros: FiltrosParlamentar = {}) {
  const key = `parlamentares:list:casa=${filtros.casa ?? '_'}:partido=${filtros.partido ?? '_'}:uf=${filtros.uf ?? '_'}`
  return cached(key, TTL.listagemFiltrada, async () => {
    const whereClauses = []
    if (filtros.casa) whereClauses.push(eq(parlamentar.casa, filtros.casa))
    if (filtros.partido)
      whereClauses.push(eq(parlamentar.partidoSigla, filtros.partido))
    if (filtros.uf) whereClauses.push(eq(parlamentar.uf, filtros.uf))

    return db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        casa: parlamentar.casa,
        partidoSigla: parlamentar.partidoSigla,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        legislatura: parlamentar.legislatura,
        sourceUrl: parlamentar.sourceUrl,
      })
      .from(parlamentar)
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(parlamentar.nome)
  })
}

export async function getParlamentarById(id: string) {
  return cached(`parlamentar:id:${id}`, TTL.parlamentarPerfil, async () => {
    const rows = await db
      .select()
      .from(parlamentar)
      .where(eq(parlamentar.id, id))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function getVotosRecentes(parlamentarId: string, limit = 10) {
  return db
    .select({
      voto: votoNominal.voto,
      votacaoId: votacao.id,
      votacaoSourceId: votacao.sourceId,
      dataHora: votacao.dataHora,
      descricao: votacao.descricao,
      orgao: votacao.orgao,
      casa: votacao.casa,
      aprovada: votacao.aprovada,
    })
    .from(votoNominal)
    .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
    .where(eq(votoNominal.parlamentarId, parlamentarId))
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

export async function getProposicoesAutoradas(
  parlamentarId: string,
  limit = 5,
) {
  return db
    .select({
      proposicaoId: proposicao.id,
      tipo: proposicao.tipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      situacao: proposicao.situacao,
      tipoAutoria: proposicaoAutor.tipoAutoria,
    })
    .from(proposicaoAutor)
    .innerJoin(proposicao, eq(proposicao.id, proposicaoAutor.proposicaoId))
    .where(eq(proposicaoAutor.parlamentarId, parlamentarId))
    .orderBy(desc(proposicao.ano), desc(proposicao.numero))
    .limit(limit)
}

export interface GastoCategoria {
  categoriaDescricao: string
  n: number
  total: string
}

export interface GastosResumo {
  totalGeral: string
  totalRegistros: number
  porCategoria: GastoCategoria[]
}

export async function getGastosResumo(
  parlamentarId: string,
  ano: number,
): Promise<GastosResumo> {
  const rows = await db
    .select({
      categoriaDescricao: gasto.categoriaDescricao,
      n: count(gasto.id),
      total: sum(gasto.valor),
    })
    .from(gasto)
    .where(
      and(
        eq(gasto.parlamentarId, parlamentarId),
        sql`extract(year from ${gasto.dataEmissao}) = ${ano}`,
      ),
    )
    .groupBy(gasto.categoriaDescricao)
    .orderBy(desc(sum(gasto.valor)))

  let totalGeralCents = 0
  let totalRegistros = 0
  const porCategoria: GastoCategoria[] = []
  for (const r of rows) {
    const totalStr = r.total ?? '0'
    // sum() retorna string; somamos em centavos (integer math) para evitar
    // erros de IEEE 754. Total geral cabe folgadamente em Number safe int
    // (R$ 80M/ano da Câmara inteira = ~8e9 centavos << 2^53).
    totalGeralCents += Math.round(Number(totalStr) * 100)
    totalRegistros += r.n
    porCategoria.push({
      categoriaDescricao: r.categoriaDescricao,
      n: r.n,
      total: totalStr,
    })
  }

  const totalGeral = (totalGeralCents / 100).toFixed(2)
  return { totalGeral, totalRegistros, porCategoria }
}

export interface AfinidadeVoto {
  parlamentarId: string
  nome: string
  partidoSigla: string
  uf: string
  casa: string
  urlFoto: string | null
  votosCoincidentes: number
  totalVotosEmComum: number
  /** Percentual entre 0 e 100, arredondado. */
  percentualAfinidade: number
}

// Constantes públicas — referenciadas no copy do componente para manter
// o disclaimer sincronizado com o cálculo.
export const TOP5_QUORUM_MINIMO = 20
export const TOP5_JANELA_MESES = 12

// Top N parlamentares com maior afinidade de voto. Métrica L2 (agregação
// determinística com fórmula publicada): para cada outro parlamentar que
// votou nas mesmas votações nominais que X dentro da janela temporal,
// conta quantos votos coincidem com X. Ordena por percentual desc, com
// total_em_comum como desempate (mais votos coincidentes em base maior
// vence empate). Top 5 final.
//
// Exclui votos AUSENTE em ambos os lados — "ambos ausentes" não é
// concordância política, é apenas não-presença.
//
// Requer quórum mínimo de votações em comum (default 20, recalibrado
// no Sprint 3.0.5 a partir do antigo default de 5) para evitar ruído
// estatístico de pares com pouquíssimas votações em conjunto que
// inflavam percentuais artificialmente para 100%. Distribuição empírica
// (2026-05-13): com quórum 5, 18.4% dos pares atingiam 100%; com 20,
// cai para 5.3%.
//
// Janela temporal (default 12 meses) descarta votações antigas que não
// refletem a configuração atual de bancadas, alianças e contexto.
export async function getTop5Afinidade(
  parlamentarId: string,
  amostraMinima = TOP5_QUORUM_MINIMO,
  janelaMeses = TOP5_JANELA_MESES,
): Promise<AfinidadeVoto[]> {
  const rows = await db.execute(sql`
    WITH votos_em_comum AS (
      SELECT
        vn2.parlamentar_id,
        COUNT(*)::int AS total_em_comum,
        COUNT(*) FILTER (WHERE vn1.voto = vn2.voto)::int AS coincidentes
      FROM votacoes.voto_nominal vn1
      JOIN votacoes.voto_nominal vn2
        ON vn2.votacao_id = vn1.votacao_id
        AND vn2.parlamentar_id <> vn1.parlamentar_id
      INNER JOIN votacoes.votacao v ON v.id = vn1.votacao_id
      WHERE vn1.parlamentar_id = ${parlamentarId}
        AND vn1.voto <> 'AUSENTE'
        AND vn2.voto <> 'AUSENTE'
        AND v.data_hora >= now() - make_interval(months => ${janelaMeses})
      GROUP BY vn2.parlamentar_id
      HAVING COUNT(*) >= ${amostraMinima}
    )
    SELECT
      p.id AS parlamentar_id,
      p.nome,
      p.partido_sigla,
      p.uf,
      p.casa,
      p.url_foto,
      vec.coincidentes,
      vec.total_em_comum
    FROM votos_em_comum vec
    JOIN parlamentares.parlamentar p ON p.id = vec.parlamentar_id
    ORDER BY
      (vec.coincidentes::float / vec.total_em_comum) DESC,
      vec.total_em_comum DESC
    LIMIT 5
  `)

  return rows.rows.map((r) => {
    const coincidentes = Number(r.coincidentes)
    const totalEmComum = Number(r.total_em_comum)
    return {
      parlamentarId: String(r.parlamentar_id),
      nome: String(r.nome),
      partidoSigla: String(r.partido_sigla),
      uf: String(r.uf),
      casa: String(r.casa),
      urlFoto: r.url_foto ? String(r.url_foto) : null,
      votosCoincidentes: coincidentes,
      totalVotosEmComum: totalEmComum,
      percentualAfinidade: Math.round((coincidentes / totalEmComum) * 100),
    }
  })
}

export async function getPartidosDistintos(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ partidoSigla: parlamentar.partidoSigla })
    .from(parlamentar)
    .orderBy(parlamentar.partidoSigla)
  return rows.map((r) => r.partidoSigla)
}

export async function getUfsDistintos(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ uf: parlamentar.uf })
    .from(parlamentar)
    .orderBy(parlamentar.uf)
  return rows.map((r) => r.uf)
}
