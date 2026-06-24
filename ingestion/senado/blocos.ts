import { sql } from 'drizzle-orm'

import { blocoPartidario } from '@/shared/db/schema'
import { db } from '../shared/db'
import { mapBlocoSenado } from './blocos-mapper'
import {
  senadoBlocoDetalheSchema,
  senadoBlocosListaSchema,
} from './blocos-schema'
import { fetchSenadoJson } from './senado-client'

// Ingere composição de blocos partidários do Senado na legislatura atual.
// Fonte: GET /composicao/lista/blocos (lista) → GET /composicao/bloco/{codigo} (detalhe).
// Idempotente: ON CONFLICT (source_id, casa) DO UPDATE substitui partidos e nome.

const PACING_MS = 200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface BlocosStats {
  blocosFetched: number
  blocosUpserted: number
  errors: Array<{ context: string; reason: string }>
}

export async function ingestBlocosSenado(): Promise<BlocosStats> {
  const stats: BlocosStats = {
    blocosFetched: 0,
    blocosUpserted: 0,
    errors: [],
  }

  const rawLista = await fetchSenadoJson<unknown>('/composicao/lista/blocos')
  const parsedLista = senadoBlocosListaSchema.safeParse(rawLista)
  if (!parsedLista.success) {
    stats.errors.push({
      context: 'composicao/lista/blocos',
      reason: parsedLista.error.issues.map((i) => i.message).join('; '),
    })
    return stats
  }

  const blocos = parsedLista.data.ListaBlocos.Bloco ?? []

  for (const blocoItem of blocos) {
    stats.blocosFetched++

    let rawDetalhe: unknown
    try {
      rawDetalhe = await fetchSenadoJson<unknown>(
        `/composicao/bloco/${blocoItem.CodigoBloco}`,
      )
    } catch (err) {
      stats.errors.push({
        context: `bloco:${blocoItem.CodigoBloco}`,
        reason: err instanceof Error ? err.message : String(err),
      })
      await sleep(PACING_MS)
      continue
    }

    const parsedDetalhe = senadoBlocoDetalheSchema.safeParse(rawDetalhe)
    if (!parsedDetalhe.success) {
      stats.errors.push({
        context: `bloco:${blocoItem.CodigoBloco}:detalhe`,
        reason: parsedDetalhe.error.issues.map((i) => i.message).join('; '),
      })
      await sleep(PACING_MS)
      continue
    }

    const row = mapBlocoSenado(parsedDetalhe.data)

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
ingestBlocosSenado()
  .then((stats) => {
    const durationMs = Date.now() - started
    console.log(
      JSON.stringify({
        event: 'ingest_blocos_senado_done',
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
        event: 'ingest_blocos_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
