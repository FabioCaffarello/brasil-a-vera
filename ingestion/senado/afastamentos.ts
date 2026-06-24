import { eq, sql } from 'drizzle-orm'

import { afastamentoSenador, parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { mapAfastamentos } from './afastamentos-mapper'
import { licencaParlamentarEnvelopeSchema } from './afastamentos-schema'
import { fetchSenadoJson } from './senado-client'

// Ingere licenças e afastamentos de senadores (Sprint 13.0, ADR-058).
// Fonte: GET /senador/{id}/licencas — loop por senador, ~80 senadores ativos.
// Explica votos AUSENTE: senador em licença médica, cargo no Executivo, etc.
//
// Idempotência: UPSERT por chave natural (parlamentar_id, motivo_sigla,
// data_inicio) — ON CONFLICT DO UPDATE data_fim + ingested_at. Não deleta
// registros antigos; o histórico de licenças é acumulativo.
//
// ⚠️ Princípio 13: copiar stats.sample no PR antes do merge para validação
// empírica do schema contra resposta real da API.

const CONCURRENCY = 4

interface AfastamentosStats {
  senadoresProcessados: number
  licencasFetched: number
  licencasUpserted: number
  licencasSkipped: number
  senadoresSemLicenca: number
  errors: Array<{ context: string; reason: string }>
  sample: Array<{ senadorId: string; licencas: number }>
}

async function loadSenadores(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, 'SENADO'))
}

async function ingestAfastamentosSenador(
  senadorId: string,
  sourceId: string,
  stats: AfastamentosStats,
): Promise<void> {
  const path = `/senador/${sourceId}/licencas`
  const sourceUrl = `https://legis.senado.leg.br/dadosabertos${path}`

  let raw: unknown
  try {
    raw = await fetchSenadoJson<unknown>(path)
  } catch (err) {
    stats.errors.push({
      context: `senador:${sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const parsed = licencaParlamentarEnvelopeSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: `senador:${sourceId}:parse`,
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }

  const rows = mapAfastamentos(parsed.data)
  stats.licencasFetched += rows.length

  if (rows.length === 0) {
    stats.senadoresSemLicenca++
    return
  }

  // Sample dos primeiros 3 senadores com licenças para validação empírica.
  if (stats.sample.length < 3) {
    stats.sample.push({ senadorId: sourceId, licencas: rows.length })
  }

  for (const row of rows) {
    if (!row.dataInicio) {
      stats.licencasSkipped++
      continue
    }
    await db
      .insert(afastamentoSenador)
      .values({
        parlamentarId: senadorId,
        motivoSigla: row.motivoSigla,
        motivoDescricao: row.motivoDescricao,
        dataInicio: row.dataInicio,
        dataFim: row.dataFim,
        trustLevel: 'L1',
        sourceUrl,
      })
      .onConflictDoUpdate({
        target: [
          afastamentoSenador.parlamentarId,
          afastamentoSenador.motivoSigla,
          afastamentoSenador.dataInicio,
        ],
        set: {
          dataFim: row.dataFim,
          motivoDescricao: row.motivoDescricao,
          ingestedAt: sql`now()`,
        },
      })
    stats.licencasUpserted++
  }
}

export async function ingestAfastamentosSenado(): Promise<AfastamentosStats> {
  const senadores = await loadSenadores()
  if (senadores.length === 0) {
    throw new Error(
      'Nenhum parlamentar SENADO no banco — rode `npm run ingest:senado:senadores` primeiro',
    )
  }

  const stats: AfastamentosStats = {
    senadoresProcessados: 0,
    licencasFetched: 0,
    licencasUpserted: 0,
    licencasSkipped: 0,
    senadoresSemLicenca: 0,
    errors: [],
    sample: [],
  }

  await runWithConcurrency(
    senadores,
    async ({ id, sourceId }) => {
      await ingestAfastamentosSenador(id, sourceId, stats)
      stats.senadoresProcessados++
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
readIngestEnv()
ingestAfastamentosSenado()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_afastamentos_senado_done',
        durationMs,
        senadoresProcessados: stats.senadoresProcessados,
        licencasFetched: stats.licencasFetched,
        licencasUpserted: stats.licencasUpserted,
        licencasSkipped: stats.licencasSkipped,
        senadoresSemLicenca: stats.senadoresSemLicenca,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
        sample: stats.sample,
      }),
    )
    process.exit(
      stats.errors.length > 0 && stats.licencasUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_afastamentos_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
