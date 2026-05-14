import { sql } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { db } from '../shared/db'
import { fetchSenadoJson } from './senado-client'
import { mapSenadorListagem } from './senadores-mapper'
import {
  listaSenadoresEnvelopeSchema,
  senadorItemSchema,
} from './senadores-schema'

interface IngestionStats {
  fetched: number
  upserted: number
  rejected: number
  errors: Array<{ sourceId: string | null; reason: string }>
}

interface SenadoEnvelope {
  ListaParlamentarEmExercicio: {
    Parlamentares: {
      Parlamentar?: unknown[]
    }
  }
}

// Tenta extrair o CodigoParlamentar de um item potencialmente malformado,
// só para enriquecer o log de erro. Retorna null se não conseguir.
function extractCodigoParlamentar(item: unknown): string | null {
  if (typeof item !== 'object' || item === null) return null
  const identificacao = (item as Record<string, unknown>)
    .IdentificacaoParlamentar
  if (typeof identificacao !== 'object' || identificacao === null) return null
  const codigo = (identificacao as Record<string, unknown>).CodigoParlamentar
  return typeof codigo === 'string' || typeof codigo === 'number'
    ? String(codigo)
    : null
}

export async function ingestSenadores(): Promise<IngestionStats> {
  const stats: IngestionStats = {
    fetched: 0,
    upserted: 0,
    rejected: 0,
    errors: [],
  }

  const raw = await fetchSenadoJson<SenadoEnvelope>('/senador/lista/atual')

  // Valida o envelope mas extrai com tipo solto para iteração — cada item
  // é validado individualmente em seguida.
  const parsedEnvelope = listaSenadoresEnvelopeSchema.safeParse(raw)
  if (!parsedEnvelope.success) {
    throw new Error(
      `Envelope do Senado inválido: ${parsedEnvelope.error.message}`,
    )
  }
  const items =
    parsedEnvelope.data.ListaParlamentarEmExercicio.Parlamentares.Parlamentar ??
    []

  for (const item of items) {
    stats.fetched++
    const parsed = senadorItemSchema.safeParse(item)
    if (!parsed.success) {
      stats.rejected++
      stats.errors.push({
        sourceId: extractCodigoParlamentar(item),
        reason: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      })
      continue
    }

    let row: ReturnType<typeof mapSenadorListagem>
    try {
      row = mapSenadorListagem(parsed.data)
    } catch (err) {
      stats.rejected++
      stats.errors.push({
        sourceId: parsed.data.IdentificacaoParlamentar.CodigoParlamentar,
        reason: err instanceof Error ? err.message : String(err),
      })
      continue
    }

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
          nomeCivil: row.nomeCivil,
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

const started = Date.now()
ingestSenadores()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_senadores_done',
        durationMs,
        fetched: stats.fetched,
        upserted: stats.upserted,
        rejected: stats.rejected,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Política unificada: só falha se houve erros E zero sucessos.
    process.exit(stats.errors.length > 0 && stats.upserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_senadores_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
