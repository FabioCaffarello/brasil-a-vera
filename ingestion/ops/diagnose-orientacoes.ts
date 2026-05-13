// Diagnóstico ad-hoc da cobertura de orientação partidária (Sprint 3.0 Tarefa 3).
//
// Roda 5 queries para mapear o "gap" de cobertura empírica e decidir entre
// 3 caminhos: (a) backfill faltando, (b) filtros restritivos, (c) limitação
// estrutural da API. Resultado alimenta copy honesto + ação corretiva.
//
// Uso: DATABASE_URL=... npx tsx --tsconfig tsconfig.ingestion.json \
//        ingestion/ops/diagnose-orientacoes.ts
//
// Read-only — nunca escreve no banco.

import { sql } from 'drizzle-orm'

import { db } from '../shared/db'

interface CoberturaRow {
  votacoes_camara_total: number
  com_orientacao: number
  pct: number
}

interface PartidoRow {
  partido_sigla: string
  orientacoes: number
}

interface MesRow {
  mes: string
  votacoes: number
  com_orientacao: number
}

interface NominaisRow {
  nominais: number
  nominais_com_orientacao: number
}

interface SampleRow {
  id: string
  source_id: string
  data_hora: string
  descricao: string
}

async function q1Cobertura(): Promise<CoberturaRow> {
  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT v.id)::int AS votacoes_camara_total,
      COUNT(DISTINCT o.votacao_id)::int AS com_orientacao,
      ROUND(100.0 * COUNT(DISTINCT o.votacao_id) / NULLIF(COUNT(DISTINCT v.id), 0), 2)::float AS pct
    FROM votacoes.votacao v
    LEFT JOIN votacoes.orientacao_bancada o ON o.votacao_id = v.id
    WHERE v.casa = 'CAMARA';
  `)
  return result.rows[0] as unknown as CoberturaRow
}

async function q2Partidos(): Promise<PartidoRow[]> {
  const result = await db.execute(sql`
    SELECT partido_sigla, COUNT(*)::int AS orientacoes
    FROM votacoes.orientacao_bancada
    GROUP BY partido_sigla
    ORDER BY orientacoes DESC;
  `)
  return result.rows as unknown as PartidoRow[]
}

async function q3PorMes(): Promise<MesRow[]> {
  const result = await db.execute(sql`
    SELECT
      TO_CHAR(date_trunc('month', v.data_hora), 'YYYY-MM') AS mes,
      COUNT(DISTINCT v.id)::int AS votacoes,
      COUNT(DISTINCT o.votacao_id)::int AS com_orientacao
    FROM votacoes.votacao v
    LEFT JOIN votacoes.orientacao_bancada o ON o.votacao_id = v.id
    WHERE v.casa = 'CAMARA'
      AND v.data_hora >= now() - interval '12 months'
    GROUP BY mes
    ORDER BY mes DESC;
  `)
  return result.rows as unknown as MesRow[]
}

async function q4Nominais(): Promise<NominaisRow> {
  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT v.id) FILTER (WHERE EXISTS (
        SELECT 1 FROM votacoes.voto_nominal vn WHERE vn.votacao_id = v.id
      ))::int AS nominais,
      COUNT(DISTINCT v.id) FILTER (WHERE EXISTS (
        SELECT 1 FROM votacoes.voto_nominal vn WHERE vn.votacao_id = v.id
      ) AND EXISTS (
        SELECT 1 FROM votacoes.orientacao_bancada o WHERE o.votacao_id = v.id
      ))::int AS nominais_com_orientacao
    FROM votacoes.votacao v
    WHERE v.casa = 'CAMARA';
  `)
  return result.rows[0] as unknown as NominaisRow
}

async function q5Sample(): Promise<SampleRow[]> {
  const result = await db.execute(sql`
    SELECT v.id, v.source_id, v.data_hora::text AS data_hora, v.descricao
    FROM votacoes.votacao v
    WHERE v.casa = 'CAMARA'
      AND EXISTS (SELECT 1 FROM votacoes.voto_nominal vn WHERE vn.votacao_id = v.id)
      AND NOT EXISTS (SELECT 1 FROM votacoes.orientacao_bancada o WHERE o.votacao_id = v.id)
    ORDER BY v.data_hora DESC
    LIMIT 5;
  `)
  return result.rows as unknown as SampleRow[]
}

async function main() {
  console.log(
    '# Diagnóstico cobertura orientacao_bancada — Sprint 3.0 Tarefa 3',
  )
  console.log(`# Timestamp: ${new Date().toISOString()}\n`)

  console.log('## Q1 — cobertura sobre Câmara (todas as votações)')
  const q1 = await q1Cobertura()
  console.log(JSON.stringify(q1, null, 2))

  console.log('\n## Q2 — distribuição por partido (rows = votacao × partido)')
  const q2 = await q2Partidos()
  console.table(q2)

  console.log('\n## Q3 — cobertura por mês (últimos 12 meses, Câmara)')
  const q3 = await q3PorMes()
  console.table(q3)

  console.log(
    '\n## Q4 — cobertura sobre nominais (denominador "deveria ter orientação")',
  )
  const q4 = await q4Nominais()
  console.log(JSON.stringify(q4, null, 2))
  const pctNominais =
    q4.nominais > 0
      ? ((q4.nominais_com_orientacao / q4.nominais) * 100).toFixed(2)
      : '0'
  console.log(`# pct sobre nominais: ${pctNominais}%`)

  console.log('\n## Q5 — 5 votações nominais SEM orientação (sample p/ Fase 3)')
  const q5 = await q5Sample()
  console.table(q5)

  console.log('\n## Q6 — votações + voto_nominal por casa')
  const q6 = await db.execute(sql`
    SELECT
      v.casa,
      COUNT(DISTINCT v.id)::int AS votacoes,
      COUNT(vn.id)::int AS voto_nominal_rows,
      COUNT(DISTINCT v.id) FILTER (WHERE vn.id IS NOT NULL)::int AS votacoes_com_voto_nominal
    FROM votacoes.votacao v
    LEFT JOIN votacoes.voto_nominal vn ON vn.votacao_id = v.id
    GROUP BY v.casa;
  `)
  console.table(q6.rows)

  console.log('\n## Q7 — top 5 votações por número de voto_nominal (Câmara)')
  const q7 = await db.execute(sql`
    SELECT
      v.id,
      v.source_id,
      v.data_hora::text AS data_hora,
      COUNT(vn.id)::int AS votos,
      EXISTS (SELECT 1 FROM votacoes.orientacao_bancada o WHERE o.votacao_id = v.id) AS tem_orientacao
    FROM votacoes.votacao v
    INNER JOIN votacoes.voto_nominal vn ON vn.votacao_id = v.id
    WHERE v.casa = 'CAMARA'
    GROUP BY v.id, v.source_id, v.data_hora
    ORDER BY votos DESC
    LIMIT 5;
  `)
  console.table(q7.rows)

  console.log(
    '\n## Q8 — situação da tramitação (sinal de alarme do /api/stats)',
  )
  const q8 = await db.execute(sql`
    SELECT
      COUNT(DISTINCT p.id)::int AS proposicoes_totais,
      COUNT(DISTINCT t.proposicao_id)::int AS proposicoes_com_tramitacao,
      COUNT(t.id)::int AS eventos_total
    FROM proposicoes.proposicao p
    LEFT JOIN proposicoes.tramitacao t ON t.proposicao_id = p.id;
  `)
  console.table(q8.rows)

  process.exit(0)
}

main().catch((err) => {
  console.error('diagnose failed:', err)
  process.exit(1)
})
