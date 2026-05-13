// Baseline empírico para Sprint 3.0.5 — refinamento NLP + recalibragem top 5.
//
// Roda contra prod (read-only) para medir:
// - Cobertura atual de classificação de direção de proposições
// - Distribuição de pares contraditórios por parlamentar
// - Distribuição de afinidade (quantos pares atingem 100% com base baixa)
//
// Uso: DATABASE_URL=... npx tsx --tsconfig tsconfig.ingestion.json \
//        ingestion/ops/diagnose-3-0-5-baseline.ts

import { sql } from 'drizzle-orm'

import { classifyDirecao } from '@/lib/coerencia/direcao-classifier'
import { db } from '../shared/db'

async function main() {
  console.log('# Baseline Sprint 3.0.5 — refinamento NLP + recalibragem top 5')
  console.log(`# Timestamp: ${new Date().toISOString()}\n`)

  // ── PARTE 1: classificação de direção ──────────────────────────────────
  console.log(
    '## P1 — Cobertura de classificação de direção (Câmara, votação nominal)',
  )

  const ementas = await db.execute(sql`
    SELECT DISTINCT p.id, p.ementa
    FROM proposicoes.proposicao p
    INNER JOIN votacoes.votacao v ON v.proposicao_id = p.id
    WHERE EXISTS (SELECT 1 FROM votacoes.voto_nominal vn WHERE vn.votacao_id = v.id)
      AND v.casa = 'CAMARA'
  `)
  const total = ementas.rows.length

  let restritivas = 0
  let permissivas = 0
  let naoClassificadas = 0
  const naoClassificadasSample: string[] = []
  for (const r of ementas.rows) {
    const ementa = (r.ementa as string | null) ?? ''
    const direcao = classifyDirecao(ementa)
    if (direcao === 'RESTRITIVA') restritivas++
    else if (direcao === 'PERMISSIVA') permissivas++
    else {
      naoClassificadas++
      if (naoClassificadasSample.length < 15) {
        naoClassificadasSample.push(ementa.slice(0, 140))
      }
    }
  }

  console.log(
    `total ementas (proposições com votação nominal Câmara): ${total}`,
  )
  console.log(
    `  RESTRITIVA:       ${restritivas} (${pct(restritivas, total)}%)`,
  )
  console.log(
    `  PERMISSIVA:       ${permissivas} (${pct(permissivas, total)}%)`,
  )
  console.log(
    `  NAO_CLASSIFICADA: ${naoClassificadas} (${pct(naoClassificadas, total)}%)`,
  )
  console.log(
    '\n### Sample NAO_CLASSIFICADA (15 primeiras — para identificar verbos faltando)',
  )
  for (const e of naoClassificadasSample) {
    console.log(`  - ${e}`)
  }

  // ── PARTE 2: pares contraditórios atuais ───────────────────────────────
  console.log('\n## P2 — Pares contraditórios atuais (top 10 parlamentares)')
  const pares = await db.execute(sql`
    SELECT
      vn.parlamentar_id,
      p.nome,
      p.partido_sigla,
      COUNT(*)::int AS votos_classificados
    FROM votacoes.voto_nominal vn
    INNER JOIN votacoes.votacao v ON v.id = vn.votacao_id
    INNER JOIN proposicoes.proposicao prop ON prop.id = v.proposicao_id
    INNER JOIN parlamentares.parlamentar p ON p.id = vn.parlamentar_id
    WHERE vn.voto IN ('SIM','NAO')
    GROUP BY vn.parlamentar_id, p.nome, p.partido_sigla
    ORDER BY votos_classificados DESC
    LIMIT 10
  `)
  console.table(pares.rows)

  // ── PARTE 3: distribuição de afinidade (top 5 com amostra mínima atual = 5) ──
  console.log(
    '\n## P3 — Distribuição totalVotosEmComum (Top 5 atualmente exibe pares com mín 5)',
  )
  const distribuicao = await db.execute(sql`
    WITH pares AS (
      SELECT
        vn1.parlamentar_id AS p1,
        vn2.parlamentar_id AS p2,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE vn1.voto = vn2.voto)::int AS coincidentes
      FROM votacoes.voto_nominal vn1
      JOIN votacoes.voto_nominal vn2
        ON vn2.votacao_id = vn1.votacao_id
        AND vn2.parlamentar_id <> vn1.parlamentar_id
      WHERE vn1.voto <> 'AUSENTE'
        AND vn2.voto <> 'AUSENTE'
      GROUP BY p1, p2
      HAVING COUNT(*) >= 5
    )
    SELECT
      CASE
        WHEN total < 10 THEN 'lt_10'
        WHEN total < 20 THEN 'lt_20'
        WHEN total < 30 THEN 'lt_30'
        WHEN total < 50 THEN 'lt_50'
        ELSE 'gte_50'
      END AS bucket,
      COUNT(*)::int AS pares_no_bucket,
      COUNT(*) FILTER (WHERE coincidentes = total)::int AS perfeitos_100pct
    FROM pares
    GROUP BY bucket
    ORDER BY bucket
  `)
  console.table(distribuicao.rows)

  console.log('\n## P4 — quantos pares teriam 100% em quóruns alternativos')
  const cenarios = await db.execute(sql`
    WITH pares AS (
      SELECT
        vn1.parlamentar_id AS p1,
        vn2.parlamentar_id AS p2,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE vn1.voto = vn2.voto)::int AS coincidentes
      FROM votacoes.voto_nominal vn1
      JOIN votacoes.voto_nominal vn2
        ON vn2.votacao_id = vn1.votacao_id
        AND vn2.parlamentar_id <> vn1.parlamentar_id
      WHERE vn1.voto <> 'AUSENTE'
        AND vn2.voto <> 'AUSENTE'
      GROUP BY p1, p2
    )
    SELECT
      'min=5'   AS quorum, COUNT(*) FILTER (WHERE total >= 5)::int  AS pares_elegiveis, COUNT(*) FILTER (WHERE total >= 5 AND coincidentes = total)::int  AS perfeitos_100pct
    FROM pares
    UNION ALL
    SELECT 'min=10', COUNT(*) FILTER (WHERE total >= 10)::int, COUNT(*) FILTER (WHERE total >= 10 AND coincidentes = total)::int FROM pares
    UNION ALL
    SELECT 'min=15', COUNT(*) FILTER (WHERE total >= 15)::int, COUNT(*) FILTER (WHERE total >= 15 AND coincidentes = total)::int FROM pares
    UNION ALL
    SELECT 'min=20', COUNT(*) FILTER (WHERE total >= 20)::int, COUNT(*) FILTER (WHERE total >= 20 AND coincidentes = total)::int FROM pares
    UNION ALL
    SELECT 'min=30', COUNT(*) FILTER (WHERE total >= 30)::int, COUNT(*) FILTER (WHERE total >= 30 AND coincidentes = total)::int FROM pares
  `)
  console.table(cenarios.rows)

  process.exit(0)
}

function pct(n: number, total: number): string {
  if (total === 0) return '0'
  return ((n / total) * 100).toFixed(1)
}

main().catch((err) => {
  console.error('baseline failed:', err)
  process.exit(1)
})
