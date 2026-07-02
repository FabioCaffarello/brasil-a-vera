import { sql } from 'drizzle-orm'

import { blocoPartidario } from '@/shared/db/schema'
import { db } from '../shared/db'
import { mapBlocoSenado } from './blocos-mapper'
import { senadoBlocosListaSchema } from './blocos-schema'
import { fetchSenadoJson } from './senado-client'

// Ingere composição de blocos partidários do Senado na legislatura atual.
// Fonte: GET /dados/ListaBlocoParlamentar.json — arquivo JSON unificado com
// todos os blocos e seus membros em uma única chamada (substitui o fluxo
// /composicao/lista/blocos → /composicao/bloco/{codigo} descontinuado em 2026-07).
// Idempotente: ON CONFLICT (source_id, casa) DO UPDATE substitui partidos e nome.

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

  const rawLista = await fetchSenadoJson<unknown>(
    '/dados/ListaBlocoParlamentar.json',
  )
  const parsedLista = senadoBlocosListaSchema.safeParse(rawLista)
  if (!parsedLista.success) {
    stats.errors.push({
      context: '/dados/ListaBlocoParlamentar.json',
      reason: parsedLista.error.issues.map((i) => i.message).join('; '),
    })
    return stats
  }

  const blocos = parsedLista.data.Blocos.Bloco ?? []
  stats.blocosFetched = blocos.length

  for (const blocoItem of blocos) {
    const row = mapBlocoSenado(blocoItem)

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
