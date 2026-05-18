import { and, asc, count, desc, eq, ilike, sql, sum } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { estatisticaParlamentarAgregada } from '@/modules/parlamentares/domain/schema'
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

export type OrdemListagem = 'nome' | 'alinhamento' | 'gasto' | 'proposicoes'

export const ORDENS_LISTAGEM: OrdemListagem[] = [
  'nome',
  'alinhamento',
  'gasto',
  'proposicoes',
]

export interface FiltrosParlamentar {
  casa?: Casa
  partido?: string
  uf?: string
  /** Busca por nome via ILIKE '%termo%'. Trim aplicado antes da query. */
  q?: string
  /** Ordenação. Default 'nome' ASC. */
  ordem?: OrdemListagem
}

export async function listParlamentares(filtros: FiltrosParlamentar = {}) {
  const q = filtros.q?.trim()
  const ordem = filtros.ordem ?? 'nome'

  const key = `parlamentares:list:casa=${filtros.casa ?? '_'}:partido=${filtros.partido ?? '_'}:uf=${filtros.uf ?? '_'}:q=${q ?? '_'}:ordem=${ordem}`
  return cached(key, TTL.listagemFiltrada, async () => {
    const whereClauses = []
    if (filtros.casa) whereClauses.push(eq(parlamentar.casa, filtros.casa))
    if (filtros.partido)
      whereClauses.push(eq(parlamentar.partidoSigla, filtros.partido))
    if (filtros.uf) whereClauses.push(eq(parlamentar.uf, filtros.uf))
    if (q) whereClauses.push(ilike(parlamentar.nome, `%${q}%`))

    // Ordens não-nome dependem da tabela agregada (Sprint 7.0 PR1).
    // LEFT JOIN preserva parlamentares sem agregado (recém-empossados,
    // suplência atípica) — eles caem no fim via NULLS LAST + tiebreak
    // por nome ASC para determinismo.
    const orderBy = (() => {
      switch (ordem) {
        case 'alinhamento':
          return sql`${estatisticaParlamentarAgregada.pctAlinhamento} DESC NULLS LAST, ${parlamentar.nome} ASC`
        case 'gasto':
          return sql`${estatisticaParlamentarAgregada.gastoTotalAno} DESC NULLS LAST, ${parlamentar.nome} ASC`
        case 'proposicoes':
          return sql`${estatisticaParlamentarAgregada.proposicoesCount} DESC NULLS LAST, ${parlamentar.nome} ASC`
        default:
          return asc(parlamentar.nome)
      }
    })()

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
        // Agregado (Sprint 7.0 PR1 / 7.1 PR4) — consumido pelo
        // ParlamentarCard v2 para barra de alinhamento + texto de amostra.
        // Pode ser null quando ainda não rodou o seed para esta linha.
        pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
        votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
      })
      .from(parlamentar)
      .leftJoin(
        estatisticaParlamentarAgregada,
        eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
      )
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(orderBy)
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

export interface AlinhamentoMensalPoint {
  /** YYYY-MM (ex.: "2026-04"). */
  mes: string
  /** % de alinhamento no mês (0-100, arredondado). null se total = 0. */
  percentual: number | null
  /** Votações comparáveis no mês (exclui AUSENTE e LIBERADO). */
  total: number
}

// Série mensal de alinhamento com a bancada (Wave 7 Sprint 7.0 PR4 — fonte
// de dado para o sparkline em src/components/parlamentar/alinhamento.tsx).
// Aplica os mesmos filtros de src/modules/parlamentares/domain/alinhamento.ts:
// exclui voto AUSENTE e orientacao LIBERADO. Comparação via cast text.
//
// Janela default 12 meses fixa o eixo temporal do sparkline. Meses sem voto
// não aparecem na série — UI lida com lacunas (não preenche com zeros).
export async function getAlinhamentoMensal(
  parlamentarId: string,
  meses = 12,
): Promise<AlinhamentoMensalPoint[]> {
  return cached(
    `parlamentar:alinhamento_mensal:${parlamentarId}:m=${meses}`,
    TTL.alinhamentoPartidario,
    async () => {
      type Row = { mes: string; total: number; alinhados: number }
      const result = await db.execute(sql`
        SELECT
          to_char(${votacao.dataHora}, 'YYYY-MM') AS mes,
          COUNT(*) FILTER (
            WHERE ${votoNominal.voto} != 'AUSENTE'
              AND ob.orientacao != 'LIBERADO'
          )::int AS total,
          COUNT(*) FILTER (
            WHERE ${votoNominal.voto} != 'AUSENTE'
              AND ob.orientacao != 'LIBERADO'
              AND ${votoNominal.voto}::text = ob.orientacao::text
          )::int AS alinhados
        FROM ${votoNominal}
        JOIN ${votacao} ON ${votacao.id} = ${votoNominal.votacaoId}
        JOIN ${parlamentar} ON ${parlamentar.id} = ${votoNominal.parlamentarId}
        JOIN votacoes.orientacao_bancada ob
          ON ob.votacao_id = ${votoNominal.votacaoId}
          AND ob.partido_sigla = ${parlamentar.partidoSigla}
        WHERE ${votoNominal.parlamentarId} = ${parlamentarId}
          AND ${votacao.dataHora} >= now() - (${meses} || ' months')::interval
        GROUP BY 1
        ORDER BY 1
      `)

      // db.execute retorna shape diferente por driver (Neon serverless tem
      // .rows; Neon HTTP retorna array direto). Normaliza ambos.
      const rows = (
        Array.isArray(result)
          ? result
          : ((result as unknown as { rows: Row[] }).rows ?? [])
      ) as Row[]

      return rows
        .filter((r) => r.total > 0)
        .map((r) => ({
          mes: r.mes,
          total: r.total,
          percentual: Math.round((r.alinhados / r.total) * 100),
        }))
    },
  )
}

export interface GastoMensalPoint {
  /** YYYY-MM (ex.: "2026-04"). */
  mes: string
  /** Gasto do parlamentar no mês (BRL, fixed 2). 0 se sem registros. */
  valor: string
  /** Mediana de gasto entre parlamentares da mesma casa nesse mês. 0 se vazio. */
  medianaCasa: string
}

// Série mensal de gasto do parlamentar comparada com a mediana mensal da casa
// (Wave 7 Sprint 7.0 PR4 — fonte do gráfico de linha em /parlamentares/[id]
// Sprint 7.4). Gera 12 meses do ano (Jan-Dez) mesmo quando o parlamentar não
// teve gasto registrado no mês — UI plota linha contínua com zeros.
//
// Mediana é calculada SOBRE os parlamentares com gasto no mês (não inclui
// "0" implícito de quem não gastou) — interpretação editorial: o sinal
// cívico é "entre quem gastou, em que faixa este parlamentar está?".
export async function getGastosMensalMedianaCasa(
  parlamentarId: string,
  ano: number,
): Promise<GastoMensalPoint[]> {
  return cached(
    `parlamentar:gasto_mensal:${parlamentarId}:ano=${ano}`,
    TTL.gastoAnoCorrente,
    async () => {
      type Row = { mes: string; valor: string; mediana_casa: string }
      const result = await db.execute(sql`
        WITH meses AS (
          SELECT to_char(d, 'YYYY-MM') AS mes
          FROM generate_series(
            make_date(${ano}, 1, 1),
            make_date(${ano}, 12, 1),
            interval '1 month'
          ) AS d
        ),
        casa_alvo AS (
          SELECT casa FROM ${parlamentar} WHERE id = ${parlamentarId}
        ),
        gasto_parlamentar_mes AS (
          SELECT
            to_char(${gasto.dataEmissao}, 'YYYY-MM') AS mes,
            SUM(${gasto.valor})::numeric(14, 2) AS valor
          FROM ${gasto}
          WHERE ${gasto.parlamentarId} = ${parlamentarId}
            AND EXTRACT(YEAR FROM ${gasto.dataEmissao}) = ${ano}
          GROUP BY 1
        ),
        gasto_casa_mes AS (
          SELECT
            to_char(g.data_emissao, 'YYYY-MM') AS mes,
            g.parlamentar_id,
            SUM(g.valor) AS valor
          FROM gastos.gasto g
          JOIN ${parlamentar} p ON p.id = g.parlamentar_id
          WHERE p.casa = (SELECT casa FROM casa_alvo)
            AND EXTRACT(YEAR FROM g.data_emissao) = ${ano}
          GROUP BY 1, 2
        ),
        mediana_casa_mes AS (
          SELECT
            mes,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor)::numeric(14, 2) AS mediana
          FROM gasto_casa_mes
          GROUP BY mes
        )
        SELECT
          m.mes,
          COALESCE(gpm.valor, 0)::text AS valor,
          COALESCE(mcm.mediana, 0)::text AS mediana_casa
        FROM meses m
        LEFT JOIN gasto_parlamentar_mes gpm ON gpm.mes = m.mes
        LEFT JOIN mediana_casa_mes mcm ON mcm.mes = m.mes
        ORDER BY m.mes
      `)

      const rows = (
        Array.isArray(result)
          ? result
          : ((result as unknown as { rows: Row[] }).rows ?? [])
      ) as Row[]

      return rows.map((r) => ({
        mes: r.mes,
        valor: r.valor,
        medianaCasa: r.mediana_casa,
      }))
    },
  )
}

export interface FornecedorTop {
  /** CNPJ/CPF do fornecedor, ou string vazia se sem cadastro. */
  cnpj: string
  /** Nome do fornecedor (último registrado quando há variantes). */
  nome: string
  /** Total gasto com o fornecedor no ano (BRL, fixed 2, como string). */
  total: string
  /** Quantidade de registros (notas/recibos) agrupados. */
  registros: number
}

// Top N fornecedores por valor total no ano (Wave 7 Sprint 7.0 PR4 — fonte
// para o "drill-down de gastos" em /parlamentares/[id] Sprint 7.4).
//
// Agrupa por COALESCE(cnpj, nome) — CNPJ é a chave forte; quando ausente
// (gastos antigos da Câmara, gastos do Senado sem cadastro), fallback no
// nome. MAX(nome) escolhe o último registrado quando há variantes.
//
// Limite default 5 alinha com o card "Top 5 fornecedores" da spec
// docs/features/PARLAMENTAR-360.md.
export async function getGastosTopFornecedores(
  parlamentarId: string,
  ano: number,
  limit = 5,
): Promise<FornecedorTop[]> {
  return cached(
    `parlamentar:top_fornecedores:${parlamentarId}:ano=${ano}:lim=${limit}`,
    TTL.gastoAnoCorrente,
    async () => {
      // Agrupamos por COALESCE(cnpj, nome) para tratar como mesma entidade
      // os registros sem CNPJ que compartilham o nome. SELECT usa MAX em
      // ambas as colunas individuais (Postgres exige que não-agrupadas
      // estejam dentro de agregado) — MAX devolve o valor único quando há
      // só um, e o lexicograficamente maior quando há variantes.
      const rows = await db
        .select({
          cnpj: sql<string | null>`MAX(${gasto.fornecedorCnpjCpf})`.as('cnpj'),
          nome: sql<string>`MAX(${gasto.fornecedorNome})`.as('nome'),
          total: sum(gasto.valor),
          registros: count(gasto.id),
        })
        .from(gasto)
        .where(
          and(
            eq(gasto.parlamentarId, parlamentarId),
            sql`EXTRACT(YEAR FROM ${gasto.dataEmissao}) = ${ano}`,
          ),
        )
        .groupBy(
          sql`COALESCE(${gasto.fornecedorCnpjCpf}, ${gasto.fornecedorNome})`,
        )
        .orderBy(desc(sum(gasto.valor)))
        .limit(limit)

      return rows.map((r) => ({
        cnpj: r.cnpj ?? '',
        nome: r.nome,
        total: r.total ?? '0',
        registros: r.registros,
      }))
    },
  )
}

export interface ListagemStats {
  totalParlamentares: number
  totalPartidos: number
  totalUfs: number
}

// Contadores para o hero da listagem (Wave 7 Sprint 7.1 PR1). Stats são
// "geral" — não refletem filtros aplicados (513 parlamentares é a base
// inteira, não os 30 filtrados por casa=SENADO). Cache curto compartilha
// com o restante da listagem (TTL.listagemFiltrada = 300s).
export async function getListagemStats(): Promise<ListagemStats> {
  return cached(
    'parlamentares:listagem_stats',
    TTL.listagemFiltrada,
    async () => {
      const [totalRow, partidos, ufs] = await Promise.all([
        db.select({ n: count(parlamentar.id) }).from(parlamentar),
        db
          .selectDistinct({ partidoSigla: parlamentar.partidoSigla })
          .from(parlamentar),
        db.selectDistinct({ uf: parlamentar.uf }).from(parlamentar),
      ])
      return {
        totalParlamentares: totalRow[0]?.n ?? 0,
        totalPartidos: partidos.length,
        totalUfs: ufs.length,
      }
    },
  )
}
