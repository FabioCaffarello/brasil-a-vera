import { sql } from 'drizzle-orm'

import { blocoPartidario } from '@/shared/db/schema'
import { db } from '../shared/db'
import { mapBlocoCamara } from './blocos-mapper'
import {
  camaraBlocoDetalheSchema,
  camaraBlocoListSchema,
} from './blocos-schema'
import { fetchJson, paginate } from './camara-client'

// Ingere composição de blocos partidários da Câmara na legislatura atual.
// Fonte: GET /blocos (lista paginada) → GET /blocos/{id} (detalhe com partidos).
// Idempotente: ON CONFLICT (source_id, casa) DO UPDATE substitui partidos e nome.
//
// Dados quase-estáticos (ADR-056): composição de bloco muda raramente dentro
// de uma legislatura. Ingestão mensal é suficiente.

const PACING_MS = 150

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface BlocosStats {
  blocosFetched: number
  blocosUpserted: number
  errors: Array<{ context: string; reason: string }>
}

export async function ingestBlocosCamara(): Promise<BlocosStats> {
  const stats: BlocosStats = {
    blocosFetched: 0,
    blocosUpserted: 0,
    errors: [],
  }

  for await (const rawBloco of paginate('/blocos', { itens: 100 })) {
    const parsedList = camaraBlocoListSchema.safeParse(rawBloco)
    if (!parsedList.success) {
      stats.errors.push({
        context: 'blocos:list',
        reason: parsedList.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }
    stats.blocosFetched++

    let detalheRaw: unknown
    try {
      detalheRaw = await fetchJson(`/blocos/${parsedList.data.id}`)
    } catch (err) {
      stats.errors.push({
        context: `bloco:${parsedList.data.id}:detalhe`,
        reason: err instanceof Error ? err.message : String(err),
      })
      await sleep(PACING_MS)
      continue
    }

    const dados = (detalheRaw as { dados?: unknown })?.dados
    const parsedDetalhe = camaraBlocoDetalheSchema.safeParse(dados)
    if (!parsedDetalhe.success) {
      stats.errors.push({
        context: `bloco:${parsedList.data.id}:detalhe`,
        reason: parsedDetalhe.error.issues.map((i) => i.message).join('; '),
      })
      await sleep(PACING_MS)
      continue
    }

    const row = mapBlocoCamara(parsedDetalhe.data)

    // Upsert atômico: substitui partidos[] e nome a cada run.
    await db
      .insert(blocoPartidario)
      .values(row)
      .onConflictDoUpdate({
        target: [blocoPartidario.sourceId, blocoPartidario.casa],
        set: {
          nome: row.nome,
          partidos: sql`EXCLUDED.partidos`,
          ingestedAt: sql`now()`,
        },
      })

    stats.blocosUpserted++
    await sleep(PACING_MS)
  }

  return stats
}

const started = Date.now()
ingestBlocosCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    console.log(
      JSON.stringify({
        event: 'ingest_blocos_camara_done',
        durationMs,
        blocosFetched: stats.blocosFetched,
        blocosUpserted: stats.blocosUpserted,
        errorsCount: stats.errors.length,
        errorsSample: stats.errors.slice(0, 10),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.blocosUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_blocos_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
