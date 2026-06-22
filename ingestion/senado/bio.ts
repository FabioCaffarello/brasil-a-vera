import { and, eq, isNull } from 'drizzle-orm'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { mapBioSenador } from './bio-mapper'
import { senadoDetalheSchema } from './bio-schema'
import { fetchSenadoJson } from './senado-client'

// Enriquece o perfil biográfico (ADR-049 emenda) dos senadores: nascimento +
// naturalidade de GET /senador/{codigo}. O Senado não expõe escolaridade nem
// profissão — ficam null. Idempotente: processa só linhas com data_nascimento
// NULL. Per-senador (~81), rápido; fail-soft por senador.

const CASA = 'SENADO' as const
const CONCURRENCY = 4

interface BackfillStats {
  candidatos: number
  fetched: number
  preenchidos: number
  errors: Array<{ sourceId: string; reason: string }>
}

async function loadSenadoresSemBio(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(and(eq(parlamentar.casa, CASA), isNull(parlamentar.dataNascimento)))
}

async function processSenador(
  sen: { id: string; sourceId: string },
  stats: BackfillStats,
): Promise<void> {
  try {
    const raw = await fetchSenadoJson<unknown>(`/senador/${sen.sourceId}`)
    stats.fetched++
    const parsed = senadoDetalheSchema.safeParse(raw)
    if (!parsed.success) {
      stats.errors.push({
        sourceId: sen.sourceId,
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      return
    }
    const bio = mapBioSenador(parsed.data)
    await db
      .update(parlamentar)
      .set({
        dataNascimento: bio.dataNascimento,
        municipioNascimento: bio.municipioNascimento,
        ufNascimento: bio.ufNascimento,
      })
      .where(eq(parlamentar.id, sen.id))
    if (bio.dataNascimento) stats.preenchidos++
  } catch (err) {
    stats.errors.push({
      sourceId: sen.sourceId,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function backfillBioSenado(): Promise<BackfillStats> {
  const senadores = await loadSenadoresSemBio()
  const stats: BackfillStats = {
    candidatos: senadores.length,
    fetched: 0,
    preenchidos: 0,
    errors: [],
  }
  await runWithConcurrency(
    senadores,
    async (sen) => {
      await processSenador(sen, stats)
    },
    CONCURRENCY,
  )
  return stats
}

const started = Date.now()
backfillBioSenado()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'backfill_bio_senado_done',
        durationMs: Date.now() - started,
        candidatos: stats.candidatos,
        fetched: stats.fetched,
        preenchidos: stats.preenchidos,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.preenchidos === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'backfill_bio_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
