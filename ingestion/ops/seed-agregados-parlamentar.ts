// Popula a tabela parlamentares.estatistica_parlamentar_agregada (Wave 7
// Sprint 7.0 PR2). Idempotente via INSERT … ON CONFLICT (parlamentar_id)
// DO UPDATE.
//
// Uso:
//   npm run seed:agregados:parlamentar
//   npm run seed:agregados:parlamentar -- --parlamentar-id=<uuid>
//
// O modo --parlamentar-id processa apenas o uuid passado (útil para
// evitar contenção com outros crons em janelas curtas). Sem flag,
// processa todos os parlamentares em uma única query agregada com CTEs.
//
// Métrica L2 (agregação determinística com fórmula publicada):
// - pct_alinhamento: voto_nominal × orientacao_bancada, exclui AUSENTE
//   e LIBERADO; calcula % de votos coincidentes com a bancada.
// - votacoes_analisadas: total de votações comparáveis (após exclusão).
// - proposicoes_count: COUNT DISTINCT em proposicao_autor (autoria).
// - gasto_total_ano: SUM(gasto.valor) no ano corrente (EXTRACT YEAR).
// - gasto_mediana_casa: PERCENTILE_CONT(0.5) por casa (CAMARA/SENADO).
// - percentil_gasto_casa: PERCENT_RANK por casa × 100.
//
// trust_level fixo em 'L2' — métrica é agregação determinística sem
// julgamento editorial.

import { sql } from 'drizzle-orm'
import { db } from '../shared/db.js'

interface SeedSummary {
  event: 'seed_agregados_done'
  rowsAffected: number
  durationMs: number
  filter: string | null
  computedAt: string
}

function parseParlamentarId(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--parlamentar-id='))
  if (!arg) return null
  const value = arg.split('=')[1]?.trim()
  if (!value) return null
  // UUID v7 valida no banco (FK constraint). Aqui só sanitiza para
  // injeção segura — ainda que parametrizado, qualquer formato inválido
  // falha rapidamente.
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error(
      `--parlamentar-id inválido: "${value}". Esperado UUID (36 chars).`,
    )
  }
  return value
}

async function seed(parlamentarIdFilter: string | null): Promise<number> {
  // Query única com CTEs:
  // - ano_corrente: ano civil atual
  // - alinhamento_pp: alinhados/total por parlamentar (filtrando AUSENTE
  //   e LIBERADO conforme src/modules/parlamentares/domain/alinhamento.ts)
  // - proposicoes_pp: count distinct de autorias
  // - gasto_pp: SUM(valor) no ano corrente
  // - mediana_casa: PERCENTILE_CONT(0.5) por casa
  // - percentil_pp: PERCENT_RANK por casa
  //
  // INSERT ... SELECT alimenta a tabela; ON CONFLICT atualiza tudo
  // exceto a PK (idempotente — rodar 3× = mesmo estado).
  //
  // Filtro opcional WHERE p.id = $1 limita o batch a um parlamentar.
  // Quando nulo, processa toda a base (513 parlamentares).
  const result = await db.execute(sql`
    WITH
      ano_corrente AS (
        SELECT EXTRACT(YEAR FROM now())::int AS ano
      ),
      alinhamento_pp AS (
        SELECT
          vn.parlamentar_id,
          COUNT(*) FILTER (
            WHERE vn.voto != 'AUSENTE'
              AND ob.orientacao != 'LIBERADO'
          )::int AS total,
          COUNT(*) FILTER (
            WHERE vn.voto != 'AUSENTE'
              AND ob.orientacao != 'LIBERADO'
              AND vn.voto::text = ob.orientacao::text
          )::int AS alinhados
        FROM votacoes.voto_nominal vn
        JOIN parlamentares.parlamentar p ON p.id = vn.parlamentar_id
        JOIN votacoes.orientacao_bancada ob
          ON ob.votacao_id = vn.votacao_id
          AND ob.partido_sigla = p.partido_sigla
        GROUP BY vn.parlamentar_id
      ),
      proposicoes_pp AS (
        SELECT
          pa.parlamentar_id,
          COUNT(DISTINCT pa.proposicao_id)::int AS proposicoes_count
        FROM proposicoes.proposicao_autor pa
        WHERE pa.parlamentar_id IS NOT NULL
        GROUP BY pa.parlamentar_id
      ),
      gasto_pp AS (
        SELECT
          g.parlamentar_id,
          SUM(g.valor)::numeric(14, 2) AS gasto_total
        FROM gastos.gasto g, ano_corrente ac
        WHERE EXTRACT(YEAR FROM g.data_emissao) = ac.ano
        GROUP BY g.parlamentar_id
      ),
      mediana_casa AS (
        SELECT
          p.casa,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gpp.gasto_total)::numeric(14, 2) AS mediana
        FROM gasto_pp gpp
        JOIN parlamentares.parlamentar p ON p.id = gpp.parlamentar_id
        GROUP BY p.casa
      ),
      percentil_pp AS (
        SELECT
          gpp.parlamentar_id,
          (PERCENT_RANK() OVER (PARTITION BY p.casa ORDER BY gpp.gasto_total) * 100)::numeric(5, 2) AS percentil
        FROM gasto_pp gpp
        JOIN parlamentares.parlamentar p ON p.id = gpp.parlamentar_id
      )
    INSERT INTO parlamentares.estatistica_parlamentar_agregada AS e
      (parlamentar_id, pct_alinhamento, votacoes_analisadas, proposicoes_count,
       gasto_total_ano, gasto_mediana_casa, percentil_gasto_casa,
       trust_level, computed_at)
    SELECT
      p.id,
      CASE
        WHEN COALESCE(a.total, 0) > 0
        THEN ROUND((a.alinhados::numeric / a.total) * 100, 2)
        ELSE NULL
      END AS pct_alinhamento,
      COALESCE(a.total, 0) AS votacoes_analisadas,
      COALESCE(pp.proposicoes_count, 0) AS proposicoes_count,
      gpp.gasto_total AS gasto_total_ano,
      mc.mediana AS gasto_mediana_casa,
      pper.percentil AS percentil_gasto_casa,
      'L2'::trust_level,
      now()
    FROM parlamentares.parlamentar p
    LEFT JOIN alinhamento_pp a ON a.parlamentar_id = p.id
    LEFT JOIN proposicoes_pp pp ON pp.parlamentar_id = p.id
    LEFT JOIN gasto_pp gpp ON gpp.parlamentar_id = p.id
    LEFT JOIN mediana_casa mc ON mc.casa = p.casa
    LEFT JOIN percentil_pp pper ON pper.parlamentar_id = p.id
    WHERE ${parlamentarIdFilter ? sql`p.id = ${parlamentarIdFilter}` : sql`TRUE`}
    ON CONFLICT (parlamentar_id) DO UPDATE SET
      pct_alinhamento = EXCLUDED.pct_alinhamento,
      votacoes_analisadas = EXCLUDED.votacoes_analisadas,
      proposicoes_count = EXCLUDED.proposicoes_count,
      gasto_total_ano = EXCLUDED.gasto_total_ano,
      gasto_mediana_casa = EXCLUDED.gasto_mediana_casa,
      percentil_gasto_casa = EXCLUDED.percentil_gasto_casa,
      trust_level = EXCLUDED.trust_level,
      computed_at = now()
  `)

  // drizzle-orm/neon-serverless retorna { rowCount } no result do execute.
  return (result as unknown as { rowCount: number }).rowCount ?? 0
}

async function main() {
  const parlamentarIdFilter = parseParlamentarId()
  const startedAt = Date.now()
  const rowsAffected = await seed(parlamentarIdFilter)
  const durationMs = Date.now() - startedAt

  const summary: SeedSummary = {
    event: 'seed_agregados_done',
    rowsAffected,
    durationMs,
    filter: parlamentarIdFilter,
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
