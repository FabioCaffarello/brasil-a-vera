import { and, eq, isNotNull } from 'drizzle-orm'

import {
  tseCandidatura,
  votoCandidatoMunicipio,
} from '@/modules/eleitoral/domain/schema'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { createCsvRecordStream } from './csv'
import { streamTseZipEntries } from './tse-client'
import {
  type CandidatoAgregado,
  createVotoAggregator,
  mapVotoMunicipio,
} from './votacao-municipal-mapper'
import { tseVotacaoMunicipalRecordSchema } from './votacao-municipal-schema'

// Ingestão do colégio eleitoral municipal (ADR-065) — votos nominais por
// município dos parlamentares vinculados (ponte ADR-063 via tse_candidatura).
//
// Fonte: votacao_candidato_munzona_{ano}.zip — zip NACIONAL único por pleito
// (arquivos por UF não existem no CDN: 404 verificado em 2026-07-05). Interno
// ao zip, processamos só os CSVs por-UF ([A-Z]{2}): BRASIL.csv (4,3GB) é o
// consolidado redundante e _BR.csv contém apenas Presidente (verificado
// empiricamente) — inofensivo sob o filtro de cargo, mas pulamos o BRASIL.
// Streaming obrigatório: SP 2022 descomprimido (1,2GB) excede o limite de
// string do V8 (ver csv.ts / tse-client.ts).
//
// Além dos top-20 municípios por candidatura, grava o TOTAL do pleito em
// tse_candidatura.qt_votos_nominais (0 em prod para os 3 pleitos, verificado
// 2026-07-05) — denominador do % de concentração e backfill previsto pela
// migration 0034. tse-bens (tier 1) repõe candidaturas com DELETE+INSERT
// antes deste script (tier 2, mesma cadência mensal): o UPDATE re-aplica a
// cada run.
//
// Idempotência (princípio 5): DELETE-by-ano + bulk INSERT em transação por
// ano. Anos isolados — flakiness do CDN num pleito não derruba os demais.

const ANOS_PADRAO = [2014, 2018, 2022] as const

const CHUNK = 500

function zipUrl(ano: number): string {
  return `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`
}

interface AnoStats {
  ano: number
  sqsVinculados: number
  entriesProcessados: number
  linhasContabilizadas: number
  linhasRejeitadas: number
  linhasPuladas: number
  candidatosAgregados: number
  municipiosPersistidos: number
  totaisAtualizados: number
}

interface IngestionStats {
  anos: AnoStats[]
  errors: Array<{ context: string; reason: string }>
}

// SQ_CANDIDATO das candidaturas já vinculadas a um parlamentar no pleito.
// Vazio = tse-bens ainda não rodou (ou vínculo zerado) — o ano é pulado com
// erro explícito, nunca silenciosamente.
async function loadSqsVinculados(ano: number): Promise<Set<number>> {
  const rows = await db
    .select({ sq: tseCandidatura.sqCandidato })
    .from(tseCandidatura)
    .where(
      and(
        eq(tseCandidatura.anoEleicao, ano),
        isNotNull(tseCandidatura.parlamentarId),
      ),
    )
  return new Set(rows.map((r) => r.sq))
}

type VotoMunicipioInsert = typeof votoCandidatoMunicipio.$inferInsert

async function persistAno(
  ano: number,
  agregados: CandidatoAgregado[],
  sourceUrl: string,
  stats: AnoStats,
): Promise<void> {
  const values: VotoMunicipioInsert[] = []
  for (const candidato of agregados) {
    for (const m of candidato.municipios) {
      values.push({
        anoEleicao: ano,
        sqCandidato: candidato.sqCandidato,
        municipioTseCodigo: m.municipioTseCodigo,
        municipioNome: m.municipioNome,
        uf: m.uf,
        qtVotosNominais: m.qtVotosNominais,
        trustLevel: 'L1',
        sourceUrl,
      })
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(votoCandidatoMunicipio)
      .where(eq(votoCandidatoMunicipio.anoEleicao, ano))
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(votoCandidatoMunicipio).values(values.slice(i, i + CHUNK))
    }
    // Total do pleito (denominador do % de concentração) — mesma fonte L1.
    for (const candidato of agregados) {
      await tx
        .update(tseCandidatura)
        .set({ qtVotosNominais: candidato.totalVotos })
        .where(
          and(
            eq(tseCandidatura.anoEleicao, ano),
            eq(tseCandidatura.sqCandidato, candidato.sqCandidato),
          ),
        )
      stats.totaisAtualizados++
    }
  })

  stats.candidatosAgregados = agregados.length
  stats.municipiosPersistidos = values.length
}

async function ingestAno(ano: number): Promise<AnoStats> {
  const stats: AnoStats = {
    ano,
    sqsVinculados: 0,
    entriesProcessados: 0,
    linhasContabilizadas: 0,
    linhasRejeitadas: 0,
    linhasPuladas: 0,
    candidatosAgregados: 0,
    municipiosPersistidos: 0,
    totaisAtualizados: 0,
  }

  const sqs = await loadSqsVinculados(ano)
  stats.sqsVinculados = sqs.size
  if (sqs.size === 0) {
    throw new Error(
      `Nenhuma candidatura vinculada em ${ano} — rode ingest:tse:bens primeiro`,
    )
  }

  const url = zipUrl(ano)
  const aggregator = createVotoAggregator(ano, sqs)
  // Só os CSVs por-UF: exclui BRASIL.csv (consolidado, 4,3GB) e leiame.pdf.
  // _BR.csv casa o padrão mas contém apenas Presidente (filtrado por cargo).
  const entryPattern = new RegExp(
    `^votacao_candidato_munzona_${ano}_[A-Z]{2}\\.csv$`,
  )

  const processed = await streamTseZipEntries(
    url,
    (name) => entryPattern.test(name),
    () => {
      // Um record stream por entry: o header é a primeira linha de CADA CSV.
      const records = createCsvRecordStream(
        (record) => {
          const parsed = tseVotacaoMunicipalRecordSchema.safeParse(record)
          if (!parsed.success) {
            stats.linhasRejeitadas++
            return
          }
          if (aggregator.add(mapVotoMunicipio(parsed.data))) {
            stats.linhasContabilizadas++
          }
        },
        () => {
          stats.linhasPuladas++
        },
      )
      return {
        write: (text: string) => records.push(text),
        end: () => records.flush(),
      }
    },
  )
  stats.entriesProcessados = processed.length
  if (processed.length === 0) {
    throw new Error(`Nenhum CSV por-UF encontrado no zip de ${ano} (${url})`)
  }

  await persistAno(ano, aggregator.snapshot(), url, stats)
  return stats
}

export async function ingestVotacaoMunicipal(
  anos: readonly number[] = ANOS_PADRAO,
): Promise<IngestionStats> {
  const stats: IngestionStats = { anos: [], errors: [] }
  // Anos isolados: um pleito que falhe (ex.: CDN do TSE fora) não impede os demais.
  for (const ano of anos) {
    try {
      stats.anos.push(await ingestAno(ano))
    } catch (err) {
      stats.errors.push({
        context: `ano=${ano}`,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return stats
}

const started = Date.now()
const env = readIngestEnv()
const anos = env.ANO ? [env.ANO] : ANOS_PADRAO
ingestVotacaoMunicipal(anos)
  .then((stats) => {
    const durationMs = Date.now() - started
    const municipiosTotal = stats.anos.reduce(
      (a, s) => a + s.municipiosPersistidos,
      0,
    )
    console.log(
      JSON.stringify({
        event: 'ingest_votacao_municipal_done',
        durationMs,
        anosIngeridos: anos,
        municipiosTotal,
        porAno: stats.anos,
        errorsCount: stats.errors.length,
        errorsSample: stats.errors.slice(0, 10),
      }),
    )
    // Só falha se houve erro E nada foi inserido (mesma política das demais).
    process.exit(stats.errors.length > 0 && municipiosTotal === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_votacao_municipal_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
