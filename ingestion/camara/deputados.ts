import { sql } from 'drizzle-orm'
import { parlamentar } from '@/shared/db/schema'
import { db } from '../shared/db'
import { paginate } from './camara-client'
import { mapDeputadoListagem } from './deputados-mapper'
import { camaraDeputadoListagemSchema } from './deputados-schema'

interface IngestionStats {
  fetched: number
  upserted: number
  rejected: number
  errors: Array<{ sourceId: string | null; reason: string }>
}

const LEGISLATURA_PADRAO = 57 // 2023–2026

export async function ingestDeputados(
  legislatura = LEGISLATURA_PADRAO,
): Promise<IngestionStats> {
  const stats: IngestionStats = {
    fetched: 0,
    upserted: 0,
    rejected: 0,
    errors: [],
  }

  for await (const raw of paginate('/deputados', {
    idLegislatura: legislatura,
    itens: 100,
  })) {
    stats.fetched++
    const parsed = camaraDeputadoListagemSchema.safeParse(raw)
    if (!parsed.success) {
      stats.rejected++
      const sourceId =
        typeof raw === 'object' && raw !== null && 'id' in raw
          ? String((raw as { id: unknown }).id)
          : null
      stats.errors.push({
        sourceId,
        reason: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      })
      continue
    }

    const row = mapDeputadoListagem(parsed.data)

    await db
      .insert(parlamentar)
      .values({
        sourceId: row.sourceId,
        nome: row.nome,
        nomeCivil: row.nomeCivil,
        cpf: row.cpf,
        casa: row.casa,
        partidoSigla: row.partidoSigla,
        partidoNome: row.partidoNome,
        uf: row.uf,
        urlFoto: row.urlFoto,
        situacaoMandato: row.situacaoMandato,
        legislatura: row.legislatura,
        trustLevel: row.trustLevel,
        sourceUrl: row.sourceUrl,
      })
      .onConflictDoUpdate({
        target: [parlamentar.casa, parlamentar.sourceId],
        set: {
          nome: row.nome,
          partidoSigla: row.partidoSigla,
          partidoNome: row.partidoNome,
          uf: row.uf,
          urlFoto: row.urlFoto,
          situacaoMandato: row.situacaoMandato,
          legislatura: row.legislatura,
          sourceUrl: row.sourceUrl,
          ingestedAt: sql`now()`,
        },
      })

    stats.upserted++
  }

  return stats
}

// Execução standalone: `npm run ingest:camara:deputados`.
// O arquivo é só importado como script — sem guard de "main module" porque
// a verificação `import.meta.url === file://...` é frágil entre tsx/Node.
const started = Date.now()
ingestDeputados()
  .then((stats) => {
    const durationMs = Date.now() - started
    console.log(
      JSON.stringify({
        event: 'ingest_deputados_done',
        durationMs,
        ...stats,
      }),
    )
    if (stats.rejected > 0) process.exit(1)
    process.exit(0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_deputados_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
