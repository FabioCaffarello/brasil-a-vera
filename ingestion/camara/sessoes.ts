import { eq, sql } from 'drizzle-orm'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { presencaSessao, sessao } from '@/modules/votacoes/domain/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { fetchJson, paginate } from './camara-client'
import { isSessaoDeliberativaEncerrada } from './sessoes-mapper'
import {
  camaraEventoDeputadosEnvelopeSchema,
  camaraEventoSchema,
} from './sessoes-schema'

// Ingere presença física em sessões deliberativas de plenário (ADR-046).
// Pagina /eventos, fica só com `Sessão Deliberativa` encerrada, faz upsert da
// sessão e substitui em massa a presença a partir de /eventos/{id}/deputados
// (DELETE-by-sessão + INSERT, princípio 5). Câmara-only.
//
// Janela: DATA_INICIO/DATA_FIM (env) ou últimos DEFAULT_DAYS_BACK dias. O cron
// semanal mantém o recente; um run com janela larga faz o backfill histórico.

const CASA = 'CAMARA' as const
const CONCURRENCY = 4
const DEFAULT_DAYS_BACK = 30
const ITENS_POR_PAGINA = 100

interface IngestionStats {
  eventosFetched: number
  sessoesUpserted: number
  presencasUpserted: number
  /** Presentes na lista que não mapeiam um parlamentar da base. */
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
  const parsed = camaraEventoSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: 'evento',
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }
  const ev = parsed.data
  if (!isSessaoDeliberativaEncerrada(ev)) return

  try {
    const inserted = await db
      .insert(sessao)
      .values({
        sourceId: ev.id,
        casa: CASA,
        dataHora: new Date(ev.dataHoraInicio),
        descricao: ev.descricao?.trim() || ev.descricaoTipo,
        trustLevel: 'L1',
        sourceUrl: ev.uri,
      })
      .onConflictDoUpdate({
        target: [sessao.casa, sessao.sourceId],
        set: {
          dataHora: new Date(ev.dataHoraInicio),
          descricao: ev.descricao?.trim() || ev.descricaoTipo,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: sessao.id })
    const sessaoId = inserted[0]?.id
    if (!sessaoId) return

    const rawDep = await fetchJson(`/eventos/${ev.id}/deputados`)
    const depParsed = camaraEventoDeputadosEnvelopeSchema.safeParse(rawDep)
    if (!depParsed.success) {
      stats.errors.push({
        context: `evento ${ev.id} deputados`,
        reason: depParsed.error.issues.map((i) => i.message).join('; '),
      })
      return
    }

    const parlamentarIds: string[] = []
    for (const d of depParsed.data.dados) {
      const id = lookup.get(d.id)
      if (id) parlamentarIds.push(id)
      else stats.semParlamentar++
    }

    // Substituição em massa por sessão (princípio 5).
    await db.transaction(async (tx) => {
      await tx
        .delete(presencaSessao)
        .where(eq(presencaSessao.sessaoId, sessaoId))
      if (parlamentarIds.length > 0) {
        await tx
          .insert(presencaSessao)
          .values(
            parlamentarIds.map((pid) => ({ sessaoId, parlamentarId: pid })),
          )
      }
    })

    stats.sessoesUpserted++
    stats.presencasUpserted += parlamentarIds.length
  } catch (err) {
    stats.errors.push({
      context: `evento ${ev.id}`,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function ingestSessoesCamara(
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
    sessoesUpserted: 0,
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
ingestSessoesCamara({ dataInicio: env.DATA_INICIO, dataFim: env.DATA_FIM })
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_sessoes_camara_done',
        durationMs: Date.now() - started,
        eventosFetched: stats.eventosFetched,
        sessoesUpserted: stats.sessoesUpserted,
        presencasUpserted: stats.presencasUpserted,
        semParlamentar: stats.semParlamentar,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.sessoesUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_sessoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
