// Backfill one-shot: normaliza texto já persistido — auditoria UX 2026-07-20
// (Onda C). Complementa os mappers (que agora sanitizam/title-caseiam o dado
// NOVO): proposições fora da janela de ingestão e parlamentares fora de
// exercício nunca seriam reprocessados.
//
// 1. proposicao.ementa / ementa_detalhada: remove soft hyphen (U+00AD),
//    zero-widths, BOM e controles C0/C1 (SQL regexp_replace, um UPDATE).
// 2. parlamentar.nome / nome_civil: titleCaseNome nos 100% caixa alta
//    (computado em JS com a MESMA função dos mappers; UPDATE linha a linha
//    dentro de transação — ~730 linhas).
//
// Uso:
//   DRY_RUN=1 npx tsx ingestion/ops/backfill-normaliza-texto.ts  # default: só conta
//   DRY_RUN=0 npx tsx ingestion/ops/backfill-normaliza-texto.ts  # aplica
//
// Idempotente: rodar duas vezes não altera nada na segunda.

import { sql } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { db } from '../shared/db'
import { sanitizeTexto, titleCaseNome } from '../shared/texto'

// Mesma classe de caracteres de ingestion/shared/texto.ts, em sintaxe POSIX
// pro regexp_replace do Postgres.
const INVISIVEIS_SQL = `[\\u00AC\\u00AD\\u200B-\\u200D\\uFEFF\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F-\\x9F]`

async function main() {
  const dryRun = process.env.DRY_RUN !== '0'
  console.log(
    JSON.stringify({ event: 'backfill_normaliza_texto_start', dryRun }),
  )

  // --- 1. Ementas (SQL puro, set-based) ---
  const contagem = await db.execute(sql`
    SELECT count(*)::int AS afetadas
    FROM proposicoes.proposicao
    WHERE ementa ~ ${INVISIVEIS_SQL}
       OR ementa_detalhada ~ ${INVISIVEIS_SQL}
  `)
  const ementasAfetadas = (contagem.rows[0] as { afetadas: number }).afetadas
  console.log(
    JSON.stringify({ event: 'ementas_com_invisiveis', ementasAfetadas }),
  )

  if (!dryRun && ementasAfetadas > 0) {
    await db.execute(sql`
      UPDATE proposicoes.proposicao
      SET ementa = trim(regexp_replace(regexp_replace(ementa, ${INVISIVEIS_SQL}, '', 'g'), ' {2,}', ' ', 'g')),
          ementa_detalhada = CASE
            WHEN ementa_detalhada IS NULL THEN NULL
            ELSE trim(regexp_replace(regexp_replace(ementa_detalhada, ${INVISIVEIS_SQL}, '', 'g'), ' {2,}', ' ', 'g'))
          END
      WHERE ementa ~ ${INVISIVEIS_SQL}
         OR ementa_detalhada ~ ${INVISIVEIS_SQL}
    `)
    console.log(JSON.stringify({ event: 'ementas_atualizadas' }))
  }

  // --- 2. Nomes (JS, mesma função dos mappers) ---
  const rows = await db
    .select({
      id: parlamentar.id,
      nome: parlamentar.nome,
      nomeCivil: parlamentar.nomeCivil,
    })
    .from(parlamentar)

  const mudancas = rows
    .map((r) => ({
      id: r.id,
      nomeAntes: r.nome,
      nome: titleCaseNome(r.nome),
      nomeCivil: r.nomeCivil ? titleCaseNome(sanitizeTexto(r.nomeCivil)) : null,
      nomeCivilAntes: r.nomeCivil,
    }))
    .filter((r) => r.nome !== r.nomeAntes || r.nomeCivil !== r.nomeCivilAntes)

  console.log(
    JSON.stringify({
      event: 'nomes_a_normalizar',
      total: rows.length,
      mudancas: mudancas.length,
      amostra: mudancas.slice(0, 5).map((m) => `${m.nomeAntes} -> ${m.nome}`),
    }),
  )

  if (!dryRun && mudancas.length > 0) {
    await db.transaction(async (tx) => {
      for (const m of mudancas) {
        await tx.execute(sql`
          UPDATE parlamentares.parlamentar
          SET nome = ${m.nome}, nome_civil = ${m.nomeCivil}
          WHERE id = ${m.id}
        `)
      }
    })
    console.log(
      JSON.stringify({ event: 'nomes_atualizados', count: mudancas.length }),
    )
  }

  console.log(
    JSON.stringify({ event: 'backfill_normaliza_texto_done', dryRun }),
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'backfill_normaliza_texto_error',
      error: String(err).slice(0, 500),
    }),
  )
  process.exit(1)
})
