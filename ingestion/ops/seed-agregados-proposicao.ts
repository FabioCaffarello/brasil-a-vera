// Popula a tabela proposicoes.estatistica_proposicao_agregada (Wave 8
// Sprint 8.0 PR3.5). Idempotente via INSERT … ON CONFLICT (proposicao_id)
// DO UPDATE.
//
// Uso:
//   npm run seed:agregados:proposicao
//   npm run seed:agregados:proposicao -- --proposicao-id=<uuid>
//
// O modo --proposicao-id processa apenas o uuid passado (útil para
// evitar contenção com outros crons em janelas curtas). Sem flag,
// processa todas as proposições em uma única query agregada com CTEs.
//
// Métrica L2 (agregação determinística sem julgamento editorial):
// - dias_em_tramitacao: now() - MIN(tramitacao.data); zero se sem tramitação.
// - dias_desde_ultima_tramitacao: now() - MAX(tramitacao.data); NULL se
//   sem tramitação.
// - n_autores: COUNT em proposicao_autor (qualquer tipoAutoria).
// - n_partidos_autores: COUNT DISTINCT partido_sigla entre autores que são
//   parlamentares (autoria por órgão/comissão não conta).
// - n_ufs_autores: idem para UF.
// - n_votacoes / n_votacoes_aprovadas / n_votacoes_rejeitadas: COUNT em
//   votacoes.votacao com FK proposicao_id.
// - n_eventos_tramitacao: COUNT em tramitacao.
// - ultimo_orgao: orgao da tramitação mais recente (DESC ON data).
// - aprovada_em_alguma_casa: BOOL_OR(aprovada) em votações vinculadas.
// - mediana_dias_tipo_referencia: PERCENTILE_CONT(0.5) por tipoProposicao,
//   APENAS se amostra >= MIN_AMOSTRA_MEDIANA (honestidade P2 — cravado
//   rodada 2 do plano Wave 8). Caso contrário, NULL → UI suprime hint.
// - tema_canonico_codigo: tema com maior cardinalidade global entre os
//   catalogados desta proposição (decisão resolvida #4 da rodada 2).
//   Empate: alfabético da descrição do tema.
//
// trust_level fixo em 'L2' — métrica é agregação determinística.

import { sql } from 'drizzle-orm'

import { MIN_AMOSTRA_MEDIANA } from '@/modules/proposicoes/domain/mediana-amostra'

import { db } from '../shared/db.js'

interface SeedSummary {
  event: 'seed_agregados_done'
  rowsAffected: number
  durationMs: number
  filter: string | null
  computedAt: string
}

function parseProposicaoId(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--proposicao-id='))
  if (!arg) return null
  const value = arg.split('=')[1]?.trim()
  if (!value) return null
  // UUID v7 valida no banco (FK constraint). Aqui só sanitiza para
  // injeção segura — ainda que parametrizado, qualquer formato inválido
  // falha rapidamente.
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error(
      `--proposicao-id inválido: "${value}". Esperado UUID (36 chars).`,
    )
  }
  return value
}

async function seed(proposicaoIdFilter: string | null): Promise<number> {
  // Query única com 9 CTEs (uma por dimensão derivada) + INSERT ... SELECT.
  // ON CONFLICT atualiza tudo exceto a PK (idempotente — rodar 3× =
  // mesmo estado).
  //
  // Filtro opcional WHERE p.id = $1 limita o batch a uma proposição.
  // Quando nulo, processa toda a base.
  //
  // Observação sobre performance: as CTEs `dias_tramitacao_pp`,
  // `eventos_tramitacao_pp`, `ultima_tramitacao_pp` percorrem tramitacao
  // 3× — Postgres reaproveita o scan via CTE inlining se otimizado.
  // Combinar em uma única CTE com múltiplas agregações foi avaliado e
  // rejeitado: piora legibilidade sem ganho mensurável até ~50k linhas
  // de tramitacao. Reabrir se EXPLAIN ANALYZE mostrar regressão.
  const result = await db.execute(sql`
    WITH
      -- 1. Dias em tramitação por proposição (MIN/MAX de tramitacao.data).
      --    Proposições sem tramitação não aparecem aqui (LEFT JOIN final).
      dias_tramitacao_pp AS (
        SELECT
          t.proposicao_id,
          (EXTRACT(EPOCH FROM (now() - MIN(t.data))) / 86400)::int AS dias_em_tramitacao,
          (EXTRACT(EPOCH FROM (now() - MAX(t.data))) / 86400)::int AS dias_desde_ultima_tramitacao
        FROM proposicoes.tramitacao t
        GROUP BY t.proposicao_id
      ),
      -- 2. Eventos de tramitação por proposição (cardinalidade).
      eventos_tramitacao_pp AS (
        SELECT
          t.proposicao_id,
          COUNT(*)::int AS n_eventos_tramitacao
        FROM proposicoes.tramitacao t
        GROUP BY t.proposicao_id
      ),
      -- 3. Último órgão (orgao do evento mais recente). DISTINCT ON
      --    escolhe o primeiro após ORDER BY data DESC.
      ultima_tramitacao_pp AS (
        SELECT DISTINCT ON (t.proposicao_id)
          t.proposicao_id,
          t.orgao AS ultimo_orgao
        FROM proposicoes.tramitacao t
        ORDER BY t.proposicao_id, t.data DESC
      ),
      -- 4. Mediana de dias por tipo (P2: NULL se amostra < threshold).
      --    Threshold importado de @/modules/proposicoes/domain/mediana-amostra
      --    (single source of truth — DRY com decideMediana usada na UI).
      dias_por_tipo AS (
        SELECT
          p.tipo,
          (EXTRACT(EPOCH FROM (now() - MIN(t.data))) / 86400)::numeric AS dias
        FROM proposicoes.proposicao p
        INNER JOIN proposicoes.tramitacao t ON t.proposicao_id = p.id
        GROUP BY p.id, p.tipo
      ),
      mediana_tipo AS (
        SELECT
          tipo,
          CASE
            WHEN COUNT(*) >= ${MIN_AMOSTRA_MEDIANA}
            THEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dias)::int
            ELSE NULL
          END AS mediana_dias
        FROM dias_por_tipo
        GROUP BY tipo
      ),
      -- 5. Cardinalidade global por tema (proposições por código de tema).
      --    Usada para escolher o tema "canônico" de cada proposição.
      tema_cardinalidade AS (
        SELECT
          codigo_tema,
          COUNT(*)::int AS global_count
        FROM proposicoes.proposicao_tema
        GROUP BY codigo_tema
      ),
      -- 6. Tema canônico por proposição: para cada proposição com temas
      --    catalogados, escolhe o tema com maior cardinalidade global.
      --    Empate: alfabético da descrição (estável). DISTINCT ON aplica
      --    o tiebreak sobre o ORDER BY.
      tema_canonico_pp AS (
        SELECT DISTINCT ON (pt.proposicao_id)
          pt.proposicao_id,
          pt.codigo_tema AS tema_canonico_codigo
        FROM proposicoes.proposicao_tema pt
        JOIN tema_cardinalidade tc ON tc.codigo_tema = pt.codigo_tema
        ORDER BY pt.proposicao_id, tc.global_count DESC, pt.nome_tema ASC
      ),
      -- 7. Autores por proposição. Contagens de partido/UF restritas a
      --    parlamentares (parlamentar_id IS NOT NULL) — autoria por órgão
      --    não tem partido nem UF, decisão de honestidade do dado.
      autores_pp AS (
        SELECT
          pa.proposicao_id,
          COUNT(*)::int AS n_autores,
          COUNT(DISTINCT p.partido_sigla) FILTER (
            WHERE pa.parlamentar_id IS NOT NULL
          )::int AS n_partidos_autores,
          COUNT(DISTINCT p.uf) FILTER (
            WHERE pa.parlamentar_id IS NOT NULL
          )::int AS n_ufs_autores
        FROM proposicoes.proposicao_autor pa
        LEFT JOIN parlamentares.parlamentar p ON p.id = pa.parlamentar_id
        GROUP BY pa.proposicao_id
      ),
      -- 8. Votações vinculadas por proposição. Inclui aprovadas/rejeitadas
      --    + BOOL_OR de aprovada (alimenta aprovada_em_alguma_casa).
      votacoes_pp AS (
        SELECT
          v.proposicao_id,
          COUNT(*)::int AS n_votacoes,
          COUNT(*) FILTER (WHERE v.aprovada = true)::int AS n_votacoes_aprovadas,
          COUNT(*) FILTER (WHERE v.aprovada = false)::int AS n_votacoes_rejeitadas,
          BOOL_OR(v.aprovada) AS aprovada_em_alguma_casa
        FROM votacoes.votacao v
        WHERE v.proposicao_id IS NOT NULL
        GROUP BY v.proposicao_id
      )
    INSERT INTO proposicoes.estatistica_proposicao_agregada AS e (
      proposicao_id,
      dias_em_tramitacao,
      dias_desde_ultima_tramitacao,
      n_autores,
      n_partidos_autores,
      n_ufs_autores,
      n_votacoes,
      n_votacoes_aprovadas,
      n_votacoes_rejeitadas,
      n_eventos_tramitacao,
      ultimo_orgao,
      aprovada_em_alguma_casa,
      mediana_dias_tipo_referencia,
      tema_canonico_codigo,
      trust_level,
      computed_at
    )
    SELECT
      p.id,
      COALESCE(dt.dias_em_tramitacao, 0) AS dias_em_tramitacao,
      dt.dias_desde_ultima_tramitacao,
      COALESCE(ap.n_autores, 0) AS n_autores,
      COALESCE(ap.n_partidos_autores, 0) AS n_partidos_autores,
      COALESCE(ap.n_ufs_autores, 0) AS n_ufs_autores,
      COALESCE(vp.n_votacoes, 0) AS n_votacoes,
      COALESCE(vp.n_votacoes_aprovadas, 0) AS n_votacoes_aprovadas,
      COALESCE(vp.n_votacoes_rejeitadas, 0) AS n_votacoes_rejeitadas,
      COALESCE(et.n_eventos_tramitacao, 0) AS n_eventos_tramitacao,
      ut.ultimo_orgao,
      COALESCE(vp.aprovada_em_alguma_casa, false) AS aprovada_em_alguma_casa,
      mt.mediana_dias AS mediana_dias_tipo_referencia,
      tc.tema_canonico_codigo,
      'L2'::trust_level,
      now()
    FROM proposicoes.proposicao p
    LEFT JOIN dias_tramitacao_pp dt ON dt.proposicao_id = p.id
    LEFT JOIN eventos_tramitacao_pp et ON et.proposicao_id = p.id
    LEFT JOIN ultima_tramitacao_pp ut ON ut.proposicao_id = p.id
    LEFT JOIN autores_pp ap ON ap.proposicao_id = p.id
    LEFT JOIN votacoes_pp vp ON vp.proposicao_id = p.id
    LEFT JOIN mediana_tipo mt ON mt.tipo = p.tipo
    LEFT JOIN tema_canonico_pp tc ON tc.proposicao_id = p.id
    WHERE ${proposicaoIdFilter ? sql`p.id = ${proposicaoIdFilter}` : sql`TRUE`}
    ON CONFLICT (proposicao_id) DO UPDATE SET
      dias_em_tramitacao = EXCLUDED.dias_em_tramitacao,
      dias_desde_ultima_tramitacao = EXCLUDED.dias_desde_ultima_tramitacao,
      n_autores = EXCLUDED.n_autores,
      n_partidos_autores = EXCLUDED.n_partidos_autores,
      n_ufs_autores = EXCLUDED.n_ufs_autores,
      n_votacoes = EXCLUDED.n_votacoes,
      n_votacoes_aprovadas = EXCLUDED.n_votacoes_aprovadas,
      n_votacoes_rejeitadas = EXCLUDED.n_votacoes_rejeitadas,
      n_eventos_tramitacao = EXCLUDED.n_eventos_tramitacao,
      ultimo_orgao = EXCLUDED.ultimo_orgao,
      aprovada_em_alguma_casa = EXCLUDED.aprovada_em_alguma_casa,
      mediana_dias_tipo_referencia = EXCLUDED.mediana_dias_tipo_referencia,
      tema_canonico_codigo = EXCLUDED.tema_canonico_codigo,
      trust_level = EXCLUDED.trust_level,
      computed_at = now()
  `)

  // drizzle-orm/neon-serverless retorna { rowCount } no result do execute.
  return (result as unknown as { rowCount: number }).rowCount ?? 0
}

async function main() {
  const proposicaoIdFilter = parseProposicaoId()
  const startedAt = Date.now()
  const rowsAffected = await seed(proposicaoIdFilter)
  const durationMs = Date.now() - startedAt

  const summary: SeedSummary = {
    event: 'seed_agregados_done',
    rowsAffected,
    durationMs,
    filter: proposicaoIdFilter,
    computedAt: new Date().toISOString(),
  }
  console.log(JSON.stringify(summary))
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'seed_agregados_failed',
      error: err instanceof Error ? err.message : String(err),
    }),
  )
  process.exit(1)
})
