import { and, eq, isNull } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { mapBioDeputado } from './bio-mapper'
import { fetchJson } from './camara-client'
import {
  camaraDeputadoDetalheSchema,
  camaraProfissoesSchema,
} from './deputado-detalhe-schema'

// Enriquece o perfil biográfico (ADR-049) dos deputados: escolaridade,
// nascimento, naturalidade (de /deputados/{id}) e profissão (de
// /deputados/{id}/profissoes). Câmara-only; autodeclarado.
//
// Idempotente e barato em reruns: processa só linhas com escolaridade NULL.
// Gentil de propósito (igual ao backfill-cpf): o detalhe throttla bursts →
// serial + pacing; em CI o IP do runner pode ser bloqueado, rodar local é o
// caminho confiável.

const CASA = 'CAMARA' as const
const CONCURRENCY = 1
const PACING_MS = 200
const PROGRESS_EVERY = 50

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface BackfillStats {
  candidatos: number
  fetched: number
  preenchidos: number
  errors: Array<{ sourceId: string; reason: string }>
}

async function loadDeputadosSemBio(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(and(eq(parlamentar.casa, CASA), isNull(parlamentar.escolaridade)))
}

async function processDeputado(
  dep: { id: string; sourceId: string },
  stats: BackfillStats,
): Promise<void> {
  try {
    const rawDetalhe = await fetchJson(`/deputados/${dep.sourceId}`)
    stats.fetched++
    const detalhe = camaraDeputadoDetalheSchema.safeParse(rawDetalhe)
    if (!detalhe.success) {
      stats.errors.push({
        sourceId: dep.sourceId,
        reason: detalhe.error.issues.map((i) => i.message).join('; '),
      })
      return
    }

    // Profissões é secundário: se falhar, segue só com o detalhe (fail-soft).
    let profissoes = { dados: [] as Array<{ titulo?: string | null }> }
    try {
      const rawProf = await fetchJson(`/deputados/${dep.sourceId}/profissoes`)
      const parsed = camaraProfissoesSchema.safeParse(rawProf)
      if (parsed.success) profissoes = parsed.data
    } catch {
      // mantém profissão null
    }

    const bio = mapBioDeputado(detalhe.data, profissoes)
    await db
      .update(parlamentar)
      .set({
        escolaridade: bio.escolaridade,
        dataNascimento: bio.dataNascimento,
        municipioNascimento: bio.municipioNascimento,
        ufNascimento: bio.ufNascimento,
        profissao: bio.profissao,
      })
      .where(eq(parlamentar.id, dep.id))
    stats.preenchidos++
  } catch (err) {
    stats.errors.push({
      sourceId: dep.sourceId,
      reason: err instanceof Error ? err.message : String(err),
    })
  } finally {
    const processados = stats.fetched + stats.errors.length
    if (processados % PROGRESS_EVERY === 0) {
      console.log(
        JSON.stringify({
          event: 'backfill_bio_camara_progress',
          processados,
          total: stats.candidatos,
          preenchidos: stats.preenchidos,
          errosAteAgora: stats.errors.length,
        }),
      )
    }
    await sleep(PACING_MS)
  }
}

export async function backfillBioCamara(): Promise<BackfillStats> {
  const deputados = await loadDeputadosSemBio()
  const stats: BackfillStats = {
    candidatos: deputados.length,
    fetched: 0,
    preenchidos: 0,
    errors: [],
  }
  await runWithConcurrency(
    deputados,
    async (dep) => {
      await processDeputado(dep, stats)
    },
    CONCURRENCY,
  )
  return stats
}

const started = Date.now()
backfillBioCamara()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'backfill_bio_camara_done',
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
        event: 'backfill_bio_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
