import { eq, isNotNull, sql } from 'drizzle-orm'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao, relatoria } from '@/modules/proposicoes/domain/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { mapRelatoriasSenado } from './relatorias-mapper'
import { senadoRelatoriasEnvelopeSchema } from './relatorias-schema'
import { fetchSenadoJson } from './senado-client'

// Ingere as relatorias do Senado (ADR-044, emenda 2026-06-21). Popula
// `proposicoes.relatoria` com `casa = 'SENADO'`. O relator é o próprio senador
// consultado, então parlamentar_id sempre mapeia; o join por
// `proposicao.source_id_senado` limita às matérias já ingeridas (fail-closed).
//
// ⚠️ Fonte LEGADA E FAIL-SOFT: /senador/{id}/relatorias anuncia descontinuação
// (DataDesativacaoCompleta 2026-02-01) mas ainda serve dados frescos; é a única
// fonte (a API moderna /processo não expõe relator — probe 2026-06-21). Se o
// endpoint cair, cada senador falha isolado, loga e segue — as linhas já
// ingeridas persistem (não há delete). O run só falha se TODOS falharem.

const CASA = 'SENADO' as const
const CONCURRENCY = 4

interface RelatoriaStats {
  senadores: number
  fetched: number
  comRelatoria: number
  upserted: number
  semProposicao: number
  errors: Array<{ sourceId: string; reason: string }>
}

async function loadSenadores(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
}

async function loadProposicaoPorCodigoMateria(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: proposicao.id, sourceIdSenado: proposicao.sourceIdSenado })
    .from(proposicao)
    .where(isNotNull(proposicao.sourceIdSenado))
  const map = new Map<string, string>()
  for (const r of rows) {
    if (r.sourceIdSenado) map.set(r.sourceIdSenado, r.id)
  }
  return map
}

async function processSenador(
  sen: { id: string; sourceId: string },
  porCodigoMateria: Map<string, string>,
  stats: RelatoriaStats,
): Promise<void> {
  try {
    const raw = await fetchSenadoJson<unknown>(
      `/senador/${sen.sourceId}/relatorias`,
    )
    stats.fetched++
    const parsed = senadoRelatoriasEnvelopeSchema.safeParse(raw)
    if (!parsed.success) {
      stats.errors.push({
        sourceId: sen.sourceId,
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      return
    }

    const relatorias = mapRelatoriasSenado(parsed.data)
    if (relatorias.length > 0) stats.comRelatoria++

    for (const { codigoMateria, designadoEm } of relatorias) {
      const proposicaoId = porCodigoMateria.get(codigoMateria)
      if (!proposicaoId) {
        // Matéria não ingerida como proposição → fora (fail-closed).
        stats.semProposicao++
        continue
      }
      // Upsert determinístico: na colisão (matéria relatada por mais de um
      // senador no tempo), vence a designação mais recente — independente da
      // ordem de ingestão (mantém L2 reprodutível, ADR-044).
      await db
        .insert(relatoria)
        .values({
          proposicaoId,
          casa: CASA,
          parlamentarId: sen.id,
          relatorSourceId: sen.sourceId,
          designadoEm,
        })
        .onConflictDoUpdate({
          target: [relatoria.proposicaoId, relatoria.casa],
          set: {
            parlamentarId: sen.id,
            relatorSourceId: sen.sourceId,
            designadoEm,
            ingestedAt: sql`now()`,
          },
          setWhere: sql`${relatoria.designadoEm} IS NULL OR (${designadoEm}::date IS NOT NULL AND ${designadoEm}::date >= ${relatoria.designadoEm})`,
        })
      stats.upserted++
    }
  } catch (err) {
    // Fail-soft: endpoint legado pode cair a qualquer momento.
    stats.errors.push({
      sourceId: sen.sourceId,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function ingestRelatoriasSenado(): Promise<RelatoriaStats> {
  const [senadores, porCodigoMateria] = await Promise.all([
    loadSenadores(),
    loadProposicaoPorCodigoMateria(),
  ])

  const stats: RelatoriaStats = {
    senadores: senadores.length,
    fetched: 0,
    comRelatoria: 0,
    upserted: 0,
    semProposicao: 0,
    errors: [],
  }

  await runWithConcurrency(
    senadores,
    async (sen) => {
      await processSenador(sen, porCodigoMateria, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestRelatoriasSenado()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_relatorias_senado_done',
        durationMs: Date.now() - started,
        senadores: stats.senadores,
        fetched: stats.fetched,
        comRelatoria: stats.comRelatoria,
        upserted: stats.upserted,
        semProposicao: stats.semProposicao,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Fail-soft: só falha se TODOS os senadores falharam (endpoint caiu).
    process.exit(stats.errors.length > 0 && stats.upserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_relatorias_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
