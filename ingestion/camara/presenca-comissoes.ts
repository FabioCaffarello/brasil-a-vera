import { eq } from 'drizzle-orm'

import { eventoComissaoPresenca, parlamentar } from '@/shared/db/schema'
import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import { runWithConcurrency } from '../shared/concurrency'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { fetchJson, paginate } from './camara-client'
import {
  type CamaraEventoComissao,
  camaraEventoComissaoSchema,
  isReuniaoDeLiberativaEncerrada,
} from './presenca-comissoes-schema'
import { camaraEventoDeputadosEnvelopeSchema } from './sessoes-schema'

// Ingere presença em reuniões deliberativas de comissão da Câmara (ADR-061/062).
// Tipos captados: Reunião Deliberativa + Audiência Pública e Deliberação.
// Sessão Deliberativa (plenário) fica em presenca_sessao (sessoes.ts).
//
// Estratégia: pagina /eventos, filtra tipos deliberativos de comissão
// encerrados, chama /eventos/{id}/deputados por evento, substitui em massa.
// Idempotência: DELETE WHERE evento_id = {id} + INSERT (princípio 5).

const CASA = 'CAMARA' as const
const CONCURRENCY = 4
const DEFAULT_DAYS_BACK = 90
const ITENS_POR_PAGINA = 100

interface IngestionStats {
  eventosFetched: number
  eventosProcessados: number
  presencasUpserted: number
  semParlamentar: number
  errors: Array<{ context: string; reason: string }>
}

async function loadParlamentarLookup(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
  const map = new Map<string, string>()
  for (const r of rows) map.set(r.sourceId, r.id)
  return map
}

async function processEvento(
  raw: unknown,
  lookup: Map<string, string>,
  stats: IngestionStats,
): Promise<void> {
  const parsed = camaraEventoComissaoSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: 'evento',
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }

  const ev: CamaraEventoComissao = parsed.data
  if (!isReuniaoDeLiberativaEncerrada(ev)) return

  const dataEvento = ev.dataHoraInicio.slice(0, 10)
  const orgaoSigla = ev.orgaos[0]?.sigla ?? null

  try {
    const rawDep = await fetchJson(`/eventos/${ev.id}/deputados`)
    const depParsed = camaraEventoDeputadosEnvelopeSchema.safeParse(rawDep)
    if (!depParsed.success) {
      stats.errors.push({
        context: `evento:${ev.id}:deputados`,
        reason: depParsed.error.issues.map((i) => i.message).join('; '),
      })
      return
    }

    const rows = depParsed.data.dados
      .map((d) => {
        const parlamentarId = lookup.get(d.id)
        if (!parlamentarId) {
          stats.semParlamentar++
          return null
        }
        return {
          eventoId: ev.id,
          parlamentarId,
          dataEvento,
          descricaoTipo: ev.descricaoTipo,
          orgaoSigla,
          legislatura: LEGISLATURA_ATUAL,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    await db.transaction(async (tx) => {
      await tx
        .delete(eventoComissaoPresenca)
        .where(eq(eventoComissaoPresenca.eventoId, ev.id))
      if (rows.length > 0) {
        await tx.insert(eventoComissaoPresenca).values(rows)
      }
    })

    stats.eventosProcessados++
    stats.presencasUpserted += rows.length
  } catch (err) {
    stats.errors.push({
      context: `evento:${ev.id}`,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function ingestPresencaComissoesCamara(
  opts: { dataInicio?: string; dataFim?: string } = {},
): Promise<IngestionStats> {
  const range =
    opts.dataInicio && opts.dataFim
      ? { dataInicio: opts.dataInicio, dataFim: opts.dataFim }
      : defaultDateRange(DEFAULT_DAYS_BACK)

  const lookup = await loadParlamentarLookup()
  if (lookup.size === 0) {
    throw new Error(
      'Nenhum parlamentar CAMARA no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }

  const stats: IngestionStats = {
    eventosFetched: 0,
    eventosProcessados: 0,
    presencasUpserted: 0,
    semParlamentar: 0,
    errors: [],
  }

  const items = paginate('/eventos', {
    dataInicio: range.dataInicio,
    dataFim: range.dataFim,
    itens: ITENS_POR_PAGINA,
  })

  await runWithConcurrency(
    items,
    async (raw) => {
      stats.eventosFetched++
      await processEvento(raw, lookup, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
const env = readIngestEnv()
ingestPresencaComissoesCamara({
  dataInicio: env.DATA_INICIO,
  dataFim: env.DATA_FIM,
})
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_presenca_comissoes_camara_done',
        durationMs: Date.now() - started,
        eventosFetched: stats.eventosFetched,
        eventosProcessados: stats.eventosProcessados,
        presencasUpserted: stats.presencasUpserted,
        semParlamentar: stats.semParlamentar,
        errors: errorsSample,
        ...(errorsExtra > 0 && { errorsExtra }),
      }),
    )
    if (
      stats.errors.length > 0 &&
      stats.eventosProcessados === 0 &&
      stats.presencasUpserted === 0
    ) {
      process.exit(1)
    }
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_presenca_comissoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(1)
  })
