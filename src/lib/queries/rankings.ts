import { and, asc, desc, eq, gt, isNotNull, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { estatisticaParlamentarAgregada, parlamentar } from '@/shared/db/schema'

const MIN_ELEGIVEIS_PRESENCA = 10

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

export interface RankingPresencaEntry {
  id: string
  nome: string
  partidoSigla: string | null
  uf: string
  urlFoto: string | null
  casa: 'CAMARA' | 'SENADO'
  pctPresenca: number
  presentes: number
  elegiveis: number
}

// Ranking global de presença em votações nominais de plenário.
// Adapta a lógica de fetchPresenca (presenca.ts) sem filtro por IDs:
// janela de mandato aproximada pelo min/max de participação do parlamentar.
// Requer >= MIN_ELEGIVEIS_PRESENCA votações elegíveis para entrar.
// Cold cache estimado 2–8s; cacheado 24h.
export async function getRankingPresenca(limit = 25): Promise<{
  maisPresentes: RankingPresencaEntry[]
  maisAusentes: RankingPresencaEntry[]
}> {
  return cached(`rankings:presenca:n=${limit}`, TTL.rankings, async () => {
    const presencaQuery = sql`
      WITH win AS (
        SELECT vn.parlamentar_id AS pid,
               p.casa,
               min(v.data_hora) AS lo,
               max(v.data_hora) AS hi
        FROM votacoes.voto_nominal vn
        JOIN parlamentares.parlamentar p ON p.id = vn.parlamentar_id
        JOIN votacoes.votacao v ON v.id = vn.votacao_id
        GROUP BY vn.parlamentar_id, p.casa
      ),
      elegiveis AS (
        SELECT w.pid, v.id AS votacao_id
        FROM win w
        JOIN votacoes.votacao v
          ON v.casa = w.casa
         AND v.orgao = 'PLEN'
         AND v.data_hora BETWEEN w.lo AND w.hi
        WHERE EXISTS (
          SELECT 1 FROM votacoes.voto_nominal vn2 WHERE vn2.votacao_id = v.id
        )
      ),
      contagem AS (
        SELECT
          w.pid AS parlamentar_id,
          count(e.votacao_id)::int AS elegiveis_total,
          count(e.votacao_id) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM votacoes.voto_nominal vn
              WHERE vn.votacao_id = e.votacao_id
                AND vn.parlamentar_id = w.pid
                AND vn.voto::text <> 'AUSENTE'
            )
          )::int AS presentes_total
        FROM win w
        LEFT JOIN elegiveis e ON e.pid = w.pid
        GROUP BY w.pid
      )
      SELECT
        c.parlamentar_id AS id,
        p.nome,
        p.partido_sigla AS "partidoSigla",
        p.uf,
        p.url_foto AS "urlFoto",
        p.casa,
        c.elegiveis_total AS elegiveis,
        c.presentes_total AS presentes,
        (c.presentes_total::float / c.elegiveis_total) * 100 AS pct_presenca
      FROM contagem c
      JOIN parlamentares.parlamentar p ON p.id = c.parlamentar_id
      WHERE c.elegiveis_total >= ${MIN_ELEGIVEIS_PRESENCA}
    `

    const [topRows, botRows] = await Promise.all([
      db.execute(
        sql`${presencaQuery} ORDER BY pct_presenca DESC LIMIT ${limit}`,
      ),
      db.execute(
        sql`${presencaQuery} ORDER BY pct_presenca ASC LIMIT ${limit}`,
      ),
    ])

    const toEntry = (r: Record<string, unknown>): RankingPresencaEntry => ({
      id: r.id as string,
      nome: r.nome as string,
      partidoSigla: (r.partidoSigla as string | null) ?? null,
      uf: r.uf as string,
      urlFoto: (r.urlFoto as string | null) ?? null,
      casa: r.casa as 'CAMARA' | 'SENADO',
      pctPresenca: Math.round(Number(r.pct_presenca) * 10) / 10,
      presentes: Number(r.presentes),
      elegiveis: Number(r.elegiveis),
    })

    return {
      maisPresentes: (topRows.rows as unknown as Record<string, unknown>[]).map(
        toEntry,
      ),
      maisAusentes: (botRows.rows as unknown as Record<string, unknown>[]).map(
        toEntry,
      ),
    }
  })
}

export interface RankingProposicoesEntry {
  id: string
  nome: string
  partidoSigla: string | null
  uf: string
  urlFoto: string | null
  casa: 'CAMARA' | 'SENADO'
  proposicoesCount: number
}

export async function getRankingProposicoes(
  limit = 30,
): Promise<RankingProposicoesEntry[]> {
  return cached(`rankings:proposicoes:n=${limit}`, TTL.rankings, async () => {
    const rows = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        partidoSigla: parlamentar.partidoSigla,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        casa: parlamentar.casa,
        proposicoesCount: estatisticaParlamentarAgregada.proposicoesCount,
      })
      .from(parlamentar)
      .innerJoin(
        estatisticaParlamentarAgregada,
        eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
      )
      .where(gt(estatisticaParlamentarAgregada.proposicoesCount, 0))
      .orderBy(desc(estatisticaParlamentarAgregada.proposicoesCount))
      .limit(limit)
    return rows.map((r) => ({
      ...r,
      casa: r.casa as 'CAMARA' | 'SENADO',
    }))
  })
}

export interface RankingCoerenciaEntry {
  id: string
  nome: string
  partidoSigla: string | null
  uf: string
  urlFoto: string | null
  casa: 'CAMARA' | 'SENADO'
  paresContraditoriosCount: number
}

// Top/bottom por pares contraditórios de voto. Calculado pelo seed diário via
// CTEs de classificação semântica de ementa (mesmo algoritmo de coerencia.ts).
// Requer ao menos 1 voto em proposição classificada — NULL significa que o
// parlamentar não tem votos analisáveis, não que tem 0 contradições.
export async function getRankingCoerencia(limit = 25): Promise<{
  maisPares: RankingCoerenciaEntry[]
  menosPares: RankingCoerenciaEntry[]
}> {
  // :v2 — "mais contradições" passou a exigir count > 0 (auditoria UX
  // 2026-07-20, P1.4: com a base 100% zerada as duas colunas listavam os
  // mesmos parlamentares com 0 pares).
  return cached(`rankings:coerencia:n=${limit}:v2`, TTL.rankings, async () => {
    const baseWhere = isNotNull(
      estatisticaParlamentarAgregada.paresContraditoriosCount,
    )

    const select = {
      id: parlamentar.id,
      nome: parlamentar.nome,
      partidoSigla: parlamentar.partidoSigla,
      uf: parlamentar.uf,
      urlFoto: parlamentar.urlFoto,
      casa: parlamentar.casa,
      paresContraditoriosCount:
        estatisticaParlamentarAgregada.paresContraditoriosCount,
    }

    const [maisPares, menosPares] = await Promise.all([
      db
        .select(select)
        .from(parlamentar)
        .innerJoin(
          estatisticaParlamentarAgregada,
          eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
        )
        .where(
          and(
            baseWhere,
            gt(estatisticaParlamentarAgregada.paresContraditoriosCount, 0),
          ),
        )
        .orderBy(desc(estatisticaParlamentarAgregada.paresContraditoriosCount))
        .limit(limit),
      db
        .select(select)
        .from(parlamentar)
        .innerJoin(
          estatisticaParlamentarAgregada,
          eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
        )
        .where(baseWhere)
        .orderBy(asc(estatisticaParlamentarAgregada.paresContraditoriosCount))
        .limit(limit),
    ])

    const toEntry = (r: (typeof maisPares)[number]): RankingCoerenciaEntry => ({
      id: r.id,
      nome: r.nome,
      partidoSigla: r.partidoSigla,
      uf: r.uf,
      urlFoto: r.urlFoto,
      casa: r.casa as 'CAMARA' | 'SENADO',
      paresContraditoriosCount: r.paresContraditoriosCount as unknown as number,
    })

    return {
      maisPares: maisPares.map(toEntry),
      menosPares: menosPares.map(toEntry),
    }
  })
}
