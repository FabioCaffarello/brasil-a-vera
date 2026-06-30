import { and, eq, inArray } from 'drizzle-orm'

import { liderancaCargo, parlamentar } from '@/shared/db/schema'
import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { mapCargosSenado } from './cargos-mapper'
import { senadoCargosEnvelopeSchema } from './cargos-schema'
import { fetchSenadoJson } from './senado-client'

// Ingere cargos em comissões dos senadores (G15, Sprint 27).
// Fonte: GET /senador/{codigo}/cargos.json — loop por ~81 senadores ativos.
// Persiste em `lideranca_cargo` com tipo PRESIDENTE_COMISSAO / VICE_PRESIDENTE_COMISSAO
// / MEMBRO_COMISSAO / SUPLENTE_COMISSAO (texto, ADR-056 — sem migration).
//
// Idempotência: DELETE-by-(parlamentar + casa + TIPOS_COMISSAO + legislatura)
// + INSERT dentro de transação por senador (princípio 5). Histórico preservado
// via dataFim: cargos encerrados têm dataFim não-nula e continuam na tabela.
//
// ⚠️ Princípio 13: copiar stats.sample no PR antes do merge.

const CASA = 'SENADO' as const
const CONCURRENCY = 4

// Tipos que este script gerencia — escopo do DELETE por senador.
const TIPOS_COMISSAO = [
  'PRESIDENTE_COMISSAO',
  'PRIMEIRO_VICE_PRESIDENTE_COMISSAO',
  'VICE_PRESIDENTE_COMISSAO',
  'MEMBRO_COMISSAO',
  'SUPLENTE_COMISSAO',
  'RELATOR_COMISSAO',
] as const

interface CargosStats {
  senadoresProcessados: number
  cargosFetched: number
  cargosUpserted: number
  senadoresSemCargo: number
  errors: Array<{ context: string; reason: string }>
  sample: Array<{ senadorId: string; cargos: number }>
}

async function loadSenadores(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
}

async function ingestCargosSenador(
  senadorId: string,
  sourceId: string,
  stats: CargosStats,
): Promise<void> {
  const path = `/senador/${sourceId}/cargos`

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

  const parsed = senadoCargosEnvelopeSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: `senador:${sourceId}:parse`,
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }

  const rows = mapCargosSenado(parsed.data, senadorId, LEGISLATURA_ATUAL)
  stats.cargosFetched += rows.length

  if (rows.length === 0) {
    stats.senadoresSemCargo++
    return
  }

  await db.transaction(async (tx) => {
    // Remove cargos de comissão anteriores deste senador para idempotência.
    await tx
      .delete(liderancaCargo)
      .where(
        and(
          eq(liderancaCargo.parlamentarId, senadorId),
          eq(liderancaCargo.casa, CASA),
          eq(liderancaCargo.legislatura, LEGISLATURA_ATUAL),
          inArray(liderancaCargo.tipo, [...TIPOS_COMISSAO]),
        ),
      )
    await tx.insert(liderancaCargo).values(rows)
  })

  stats.cargosUpserted += rows.length
  stats.sample.push({ senadorId: sourceId, cargos: rows.length })
}

export async function ingestCargosSenado(): Promise<CargosStats> {
  const senadores = await loadSenadores()
  if (senadores.length === 0) {
    throw new Error(
      'Nenhum parlamentar SENADO no banco — rode `npm run ingest:senado:senadores` primeiro',
    )
  }

  const stats: CargosStats = {
    senadoresProcessados: 0,
    cargosFetched: 0,
    cargosUpserted: 0,
    senadoresSemCargo: 0,
    errors: [],
    sample: [],
  }

  await runWithConcurrency(
    senadores,
    async (sen) => {
      await ingestCargosSenador(sen.id, sen.sourceId, stats)
      stats.senadoresProcessados++
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestCargosSenado()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_cargos_senado_done',
        durationMs: Date.now() - started,
        senadoresProcessados: stats.senadoresProcessados,
        cargosFetched: stats.cargosFetched,
        cargosUpserted: stats.cargosUpserted,
        senadoresSemCargo: stats.senadoresSemCargo,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
        sample: stats.sample.slice(0, 5),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.cargosUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_cargos_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
