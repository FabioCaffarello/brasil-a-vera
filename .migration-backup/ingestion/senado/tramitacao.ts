import { sql } from 'drizzle-orm'

import { proposicao, tramitacao } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { fetchSenadoJson } from './senado-client'
import { mapInformeSenado } from './tramitacao-mapper'
import {
  senadoProcessoDetalheSchema,
  senadoProcessoListItemSchema,
} from './tramitacao-schema'

const CONCURRENCY = 5

// Filtro de casa via presença de source_id_senado — coluna populada pelo
// ingestor do Senado, preservada em UPDATE pelos demais (issue #74).
// Cobre proposições compartilhadas Câmara↔Senado.

interface IngestionStats {
  proposicoesProcessadas: number
  eventosUpserted: number
  proposicoesSemIdProcesso: number
  proposicoesSemTramitacao: number
  eventosSkippedError: number
  errors: Array<{ context: string; reason: string }>
}

async function loadProposicoesSenado(): Promise<
  Array<{ id: string; sourceIdSenado: string }>
> {
  const rows = await db
    .select({ id: proposicao.id, sourceIdSenado: proposicao.sourceIdSenado })
    .from(proposicao)
    .where(sql`${proposicao.sourceIdSenado} IS NOT NULL`)
  return rows as Array<{ id: string; sourceIdSenado: string }>
}

// codigoMateria → idProcesso. Senado API antiga (`/materia/movimentacoes`)
// foi depreciada; a substituta (`/processo/{idProcesso}`) usa um id distinto.
// O endpoint de listagem aceita `codigoMateria` como filtro e devolve a
// linha com o `id` (idProcesso).
async function resolveIdProcesso(
  codigoMateria: string,
): Promise<number | null> {
  const raw = await fetchSenadoJson<unknown>(
    `/processo?codigoMateria=${codigoMateria}`,
  )
  if (!Array.isArray(raw) || raw.length === 0) return null
  const parsed = senadoProcessoListItemSchema.safeParse(raw[0])
  return parsed.success ? parsed.data.id : null
}

async function fetchInformes(idProcesso: number): Promise<unknown[]> {
  const raw = await fetchSenadoJson<unknown>(`/processo/${idProcesso}`)
  const parsed = senadoProcessoDetalheSchema.safeParse(raw)
  if (!parsed.success) return []
  const allInformes: unknown[] = []
  for (const autuacao of parsed.data.autuacoes) {
    for (const informe of autuacao.informesLegislativos) {
      allInformes.push(informe)
    }
  }
  return allInformes
}

async function processProposicao(
  prop: { id: string; sourceIdSenado: string },
  stats: IngestionStats,
): Promise<void> {
  let idProcesso: number | null
  try {
    idProcesso = await resolveIdProcesso(prop.sourceIdSenado)
  } catch (err) {
    stats.eventosSkippedError++
    stats.errors.push({
      context: `resolve:${prop.sourceIdSenado}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }
  if (idProcesso === null) {
    stats.proposicoesSemIdProcesso++
    stats.proposicoesProcessadas++
    return
  }

  let informes: unknown[]
  try {
    informes = await fetchInformes(idProcesso)
  } catch (err) {
    stats.eventosSkippedError++
    stats.errors.push({
      context: `fetch:${prop.sourceIdSenado}:${idProcesso}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  if (informes.length === 0) {
    stats.proposicoesSemTramitacao++
    stats.proposicoesProcessadas++
    return
  }

  // Re-parse + map cada informe individual. Schema do detalhe já validou
  // o array no nível autuacoes; aqui validamos por elemento pra capturar
  // anomalias específicas sem perder os irmãos válidos.
  const mappedById = new Map<string, ReturnType<typeof mapInformeSenado>>()
  for (const raw of informes) {
    // Já passou pelo schema do detalhe, então só re-parse defensivamente.
    const safe = raw as {
      id: number
      data: string
      descricao: string
      colegiado?: { sigla?: string | null; nome?: string | null } | null
      enteAdministrativo?: {
        sigla?: string | null
        nome?: string | null
      } | null
    }
    const m = mapInformeSenado(safe)
    mappedById.set(m.sourceId, m)
  }

  const unique = Array.from(mappedById.values())
  if (unique.length === 0) {
    stats.proposicoesProcessadas++
    return
  }

  await db
    .insert(tramitacao)
    .values(
      unique.map((m) => ({
        proposicaoId: prop.id,
        data: m.data,
        orgao: m.orgao,
        descricaoResumida: m.descricaoResumida,
        descricaoCompleta: m.descricaoCompleta,
        situacaoResultante: m.situacaoResultante,
        sourceId: m.sourceId,
      })),
    )
    .onConflictDoUpdate({
      target: [tramitacao.proposicaoId, tramitacao.sourceId],
      set: {
        data: sql`excluded.data`,
        orgao: sql`excluded.orgao`,
        descricaoResumida: sql`excluded.descricao_resumida`,
        descricaoCompleta: sql`excluded.descricao_completa`,
        situacaoResultante: sql`excluded.situacao_resultante`,
      },
    })

  stats.eventosUpserted += unique.length
  stats.proposicoesProcessadas++
}

export async function ingestTramitacaoSenado(): Promise<IngestionStats> {
  const proposicoes = await loadProposicoesSenado()
  if (proposicoes.length === 0) {
    throw new Error(
      'Nenhuma proposição SENADO no banco — rode `npm run ingest:senado:proposicoes` primeiro',
    )
  }

  const stats: IngestionStats = {
    proposicoesProcessadas: 0,
    eventosUpserted: 0,
    proposicoesSemIdProcesso: 0,
    proposicoesSemTramitacao: 0,
    eventosSkippedError: 0,
    errors: [],
  }

  await runWithConcurrency(
    proposicoes,
    async (p) => {
      await processProposicao(p, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestTramitacaoSenado()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_tramitacao_senado_done',
        durationMs,
        proposicoesProcessadas: stats.proposicoesProcessadas,
        eventosUpserted: stats.eventosUpserted,
        proposicoesSemIdProcesso: stats.proposicoesSemIdProcesso,
        proposicoesSemTramitacao: stats.proposicoesSemTramitacao,
        eventosSkippedError: stats.eventosSkippedError,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.eventosUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_tramitacao_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
