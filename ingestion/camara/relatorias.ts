import { eq, isNotNull, sql } from 'drizzle-orm'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao, relatoria } from '@/modules/proposicoes/domain/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { fetchJson } from './camara-client'
import { mapRelatorProposicao } from './relatorias-mapper'
import { camaraProposicaoDetalheSchema } from './relatorias-schema'

// Ingere o relator vigente/último de cada proposição da Câmara (ADR-044).
// Fonte: GET /proposicoes/{id} → statusProposicao.uriUltimoRelator. Popula
// `proposicoes.relatoria` (parlamentar × proposição), tabela-filha que herda
// trust da proposição (princípio 3).
//
// Câmara-only nesta fase. Idempotente: upsert por proposicao_id (um último
// relator por matéria). Reruns atualizam o relator quando a matéria muda de
// relator durante a tramitação.
//
// Gentil de propósito (mesmo achado do backfill-cpf): o detalhe da Câmara
// throttla bursts → serial + pacing. Em CI o IP do runner pode ser bloqueado;
// caminho confiável é rodar local.

const CASA = 'CAMARA' as const
const CONCURRENCY = 1
const PACING_MS = 200
const PROGRESS_EVERY = 50

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface RelatoriaStats {
  candidatos: number
  fetched: number
  /** Proposições com relator designado (uriUltimoRelator não-nulo). */
  comRelator: number
  /** Relator mapeado para um parlamentar da nossa base. */
  mapeados: number
  /** Relator presente mas fora da base (parlamentar_id null). */
  relatorForaDaBase: number
  /** Proposições sem relator — não geram linha (fail-closed). */
  semRelator: number
  errors: Array<{ sourceId: string; reason: string }>
}

async function loadProposicoesCamara(): Promise<
  Array<{ id: string; sourceIdCamara: string }>
> {
  const rows = await db
    .select({ id: proposicao.id, sourceIdCamara: proposicao.sourceIdCamara })
    .from(proposicao)
    .where(isNotNull(proposicao.sourceIdCamara))
  // sourceIdCamara é not-null aqui pelo filtro, mas o tipo é string | null.
  return rows.flatMap((r) =>
    r.sourceIdCamara ? [{ id: r.id, sourceIdCamara: r.sourceIdCamara }] : [],
  )
}

async function loadParlamentarPorSourceId(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
  return new Map(rows.map((r) => [r.sourceId, r.id]))
}

async function processProposicao(
  prop: { id: string; sourceIdCamara: string },
  porSourceId: Map<string, string>,
  stats: RelatoriaStats,
): Promise<void> {
  try {
    const raw = await fetchJson(`/proposicoes/${prop.sourceIdCamara}`)
    stats.fetched++
    const parsed = camaraProposicaoDetalheSchema.safeParse(raw)
    if (!parsed.success) {
      stats.errors.push({
        sourceId: prop.sourceIdCamara,
        reason: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      })
      return
    }

    const { relatorSourceId } = mapRelatorProposicao(parsed.data)
    if (relatorSourceId === null) {
      stats.semRelator++
      return
    }
    stats.comRelator++

    const parlamentarId = porSourceId.get(relatorSourceId) ?? null
    if (parlamentarId === null) stats.relatorForaDaBase++
    else stats.mapeados++

    // Upsert por proposicao_id (um último relator por matéria, ADR-044).
    await db
      .insert(relatoria)
      .values({ proposicaoId: prop.id, parlamentarId, relatorSourceId })
      .onConflictDoUpdate({
        target: relatoria.proposicaoId,
        set: { parlamentarId, relatorSourceId, ingestedAt: sql`now()` },
      })
  } catch (err) {
    stats.errors.push({
      sourceId: prop.sourceIdCamara,
      reason: err instanceof Error ? err.message : String(err),
    })
  } finally {
    const processados = stats.fetched + stats.errors.length
    if (processados % PROGRESS_EVERY === 0) {
      console.log(
        JSON.stringify({
          event: 'ingest_relatorias_camara_progress',
          processados,
          total: stats.candidatos,
          comRelator: stats.comRelator,
          mapeados: stats.mapeados,
          errosAteAgora: stats.errors.length,
        }),
      )
    }
    await sleep(PACING_MS)
  }
}

export async function ingestRelatoriasCamara(): Promise<RelatoriaStats> {
  const [proposicoes, porSourceId] = await Promise.all([
    loadProposicoesCamara(),
    loadParlamentarPorSourceId(),
  ])

  const stats: RelatoriaStats = {
    candidatos: proposicoes.length,
    fetched: 0,
    comRelator: 0,
    mapeados: 0,
    relatorForaDaBase: 0,
    semRelator: 0,
    errors: [],
  }

  await runWithConcurrency(
    proposicoes,
    async (prop) => {
      await processProposicao(prop, porSourceId, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestRelatoriasCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_relatorias_camara_done',
        durationMs,
        candidatos: stats.candidatos,
        fetched: stats.fetched,
        comRelator: stats.comRelator,
        mapeados: stats.mapeados,
        relatorForaDaBase: stats.relatorForaDaBase,
        semRelator: stats.semRelator,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Política unificada: só falha se houve erros E zero sucessos.
    process.exit(stats.errors.length > 0 && stats.comRelator === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_relatorias_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
