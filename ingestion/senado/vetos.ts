import { and, eq, ilike, sql } from 'drizzle-orm'

import {
  dispositivoVeto,
  parlamentar,
  veto as vetoTable,
  votoVeto,
} from '@/shared/db/schema'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { fetchSenadoJson } from './senado-client'
import { mapDispositivos, mapVetos, mapVotosSenado } from './vetos-mapper'
import {
  listaVetosAnoSchema,
  resultadoVetoDispositivoSchema,
  resultadoVetoMateriaSchema,
} from './vetos-schema'

// Ingere vetos presidenciais e votos nominais do Senado (Sprint 13.2, ADR-059).
// Chain 3-níveis:
//   1. /materia/vetos/{ano}                          → lista vetos do ano
//   2. /plenario/resultado/veto/materia/{materiaCod} → dispositivos + situação
//   3. /plenario/resultado/veto/dispositivo/{cod}    → votos Senado
//
// Janela: anos [2023..ano_corrente] — legislatura em exercício.
// Idempotência: UPSERT por source_id em todos os 3 níveis.
// Senado-only nos votos nominais; match por nome+UF → parlamentar_id nullable.
//
// ⚠️ Princípio 13: copiar stats.sample no PR antes do merge.

const PACING_MS = 300
const BASE_URL = 'https://legis.senado.leg.br/dadosabertos'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
const ANOS = (() => {
  const current = new Date().getFullYear()
  const anos: number[] = []
  for (let y = 2023; y <= current; y++) anos.push(y)
  return anos
})()

interface VetosStats {
  anosProcessados: number
  vetosUpserted: number
  dispositivosUpserted: number
  votosUpserted: number
  votosSenadoSemMatch: number
  errors: Array<{ context: string; reason: string }>
  sample: Array<{ ano: number; vetos: number; votos: number }>
}

// Resolve nome+UF de senador para parlamentar_id — nullable se não encontrado.
async function resolveParFamentarId(
  nome: string,
  uf: string | null,
): Promise<string | null> {
  const conditions = [
    ilike(parlamentar.nome, nome),
    eq(parlamentar.casa, 'SENADO'),
  ]
  if (uf) conditions.push(eq(parlamentar.uf, uf))

  const rows = await db
    .select({ id: parlamentar.id })
    .from(parlamentar)
    .where(and(...conditions))
    .limit(2)

  // Retorna null se não encontrou exatamente 1 match
  return rows.length === 1 ? rows[0].id : null
}

async function upsertVeto(
  row: ReturnType<typeof mapVetos>[number],
  sourceUrl: string,
): Promise<string> {
  const result = await db
    .insert(vetoTable)
    .values({
      sourceId: row.sourceId,
      materiaCodigo: row.materiaCodigo,
      numero: row.numero,
      ano: row.ano,
      ementa: row.ementa,
      materiaVetadaSigla: row.materiaVetadaSigla,
      materiaVetadaNumero: row.materiaVetadaNumero,
      materiaVetadaAno: row.materiaVetadaAno,
      materiaVetadaEmenta: row.materiaVetadaEmenta,
      vetoTotal: row.vetoTotal,
      assunto: row.assunto,
      dataPublicacao: row.dataPublicacao,
      dataRecebimentoCongresso: row.dataRecebimentoCongresso,
      emTramitacao: row.emTramitacao,
      trustLevel: 'L1',
      sourceUrl,
    })
    .onConflictDoUpdate({
      target: vetoTable.sourceId,
      set: {
        emTramitacao: row.emTramitacao,
        assunto: row.assunto,
        dataPublicacao: row.dataPublicacao,
        dataRecebimentoCongresso: row.dataRecebimentoCongresso,
        ingestedAt: sql`now()`,
      },
    })
    .returning({ id: vetoTable.id })

  return result[0].id
}

async function upsertDispositivo(
  row: ReturnType<typeof mapDispositivos>[number],
  vetoId: string,
): Promise<string> {
  const result = await db
    .insert(dispositivoVeto)
    .values({
      vetoId,
      sourceId: row.sourceId,
      identificador: row.identificador,
      descricao: row.descricao,
      assunto: row.assunto,
      situacao: row.situacao,
      tipoVotacao: row.tipoVotacao,
      dataSessao: row.dataSessao,
    })
    .onConflictDoUpdate({
      target: dispositivoVeto.sourceId,
      set: {
        situacao: row.situacao,
        dataSessao: row.dataSessao,
        ingestedAt: sql`now()`,
      },
    })
    .returning({ id: dispositivoVeto.id })

  return result[0].id
}

async function processDispositivo(
  dispositivoSourceId: string,
  dispositivoId: string,
  stats: VetosStats,
  anosVotos: { ano: number; votos: number },
): Promise<void> {
  await sleep(PACING_MS)
  const path = `/plenario/resultado/veto/dispositivo/${dispositivoSourceId}`
  const sourceUrl = `${BASE_URL}${path}`

  let raw: unknown
  try {
    raw = await fetchSenadoJson<unknown>(path)
  } catch (err) {
    stats.errors.push({
      context: `dispositivo:${dispositivoSourceId}:fetch`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const parsed = resultadoVetoDispositivoSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: `dispositivo:${dispositivoSourceId}:parse`,
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }

  const votos = mapVotosSenado(parsed.data)
  for (const votoRow of votos) {
    const parlamentarId = await resolveParFamentarId(
      votoRow.nomeRaw,
      votoRow.ufRaw,
    )
    if (!parlamentarId) stats.votosSenadoSemMatch++

    try {
      await db
        .insert(votoVeto)
        .values({
          dispositivoId,
          parlamentarId,
          nomeRaw: votoRow.nomeRaw,
          partidoRaw: votoRow.partidoRaw,
          ufRaw: votoRow.ufRaw,
          voto: votoRow.voto,
          casa: 'SENADO',
          sourceUrl,
        })
        .onConflictDoUpdate({
          target: [votoVeto.dispositivoId, votoVeto.nomeRaw, votoVeto.casa],
          set: {
            voto: votoRow.voto,
            parlamentarId,
            ingestedAt: sql`now()`,
          },
        })
      stats.votosUpserted++
      anosVotos.votos++
    } catch (err) {
      stats.errors.push({
        context: `voto:${dispositivoSourceId}:${votoRow.nomeRaw}`,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

async function processAno(ano: number, stats: VetosStats): Promise<void> {
  await sleep(PACING_MS)
  const path = `/materia/vetos/${ano}`
  const sourceUrl = `${BASE_URL}${path}`

  let raw: unknown
  try {
    raw = await fetchSenadoJson<unknown>(path)
  } catch (err) {
    stats.errors.push({
      context: `ano:${ano}:fetch`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const parsed = listaVetosAnoSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: `ano:${ano}:parse`,
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }

  const vetoRows = mapVetos(parsed.data)
  const anosVotos = { ano, votos: 0 }

  for (const vetoRow of vetoRows) {
    let vetoId: string
    try {
      vetoId = await upsertVeto(vetoRow, sourceUrl)
      stats.vetosUpserted++
    } catch (err) {
      stats.errors.push({
        context: `veto:${vetoRow.sourceId}:db`,
        reason: err instanceof Error ? err.message : String(err),
      })
      continue
    }

    // Busca dispositivos para este veto
    await sleep(PACING_MS)
    const materiaPath = `/plenario/resultado/veto/materia/${vetoRow.materiaCodigo}`
    let rawMateria: unknown
    try {
      rawMateria = await fetchSenadoJson<unknown>(materiaPath)
    } catch (err) {
      stats.errors.push({
        context: `materia:${vetoRow.materiaCodigo}:fetch`,
        reason: err instanceof Error ? err.message : String(err),
      })
      continue
    }

    const parsedMateria = resultadoVetoMateriaSchema.safeParse(rawMateria)
    if (!parsedMateria.success) {
      stats.errors.push({
        context: `materia:${vetoRow.materiaCodigo}:parse`,
        reason: parsedMateria.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }

    const dispRows = mapDispositivos(parsedMateria.data)
    for (const dispRow of dispRows) {
      let dispositivoId: string
      try {
        dispositivoId = await upsertDispositivo(dispRow, vetoId)
        stats.dispositivosUpserted++
      } catch (err) {
        stats.errors.push({
          context: `dispositivo:${dispRow.sourceId}:db`,
          reason: err instanceof Error ? err.message : String(err),
        })
        continue
      }

      if (dispRow.possuiVotos) {
        await processDispositivo(
          dispRow.sourceId,
          dispositivoId,
          stats,
          anosVotos,
        )
      }
    }
  }

  if (stats.sample.length < 3) {
    stats.sample.push({ ano, vetos: vetoRows.length, votos: anosVotos.votos })
  }
}

export async function ingestVetos(): Promise<VetosStats> {
  const stats: VetosStats = {
    anosProcessados: 0,
    vetosUpserted: 0,
    dispositivosUpserted: 0,
    votosUpserted: 0,
    votosSenadoSemMatch: 0,
    errors: [],
    sample: [],
  }

  for (const ano of ANOS) {
    await processAno(ano, stats)
    stats.anosProcessados++
  }

  return stats
}

const started = Date.now()
readIngestEnv()
ingestVetos()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_vetos_done',
        durationMs,
        anosProcessados: stats.anosProcessados,
        vetosUpserted: stats.vetosUpserted,
        dispositivosUpserted: stats.dispositivosUpserted,
        votosUpserted: stats.votosUpserted,
        votosSenadoSemMatch: stats.votosSenadoSemMatch,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
        sample: stats.sample,
      }),
    )
    process.exit(stats.errors.length > 0 && stats.vetosUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_vetos_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
