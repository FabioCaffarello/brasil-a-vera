import { and, eq, isNotNull } from 'drizzle-orm'

import {
  tseBemCandidato,
  tseCandidatura,
} from '@/modules/eleitoral/domain/schema'
import { parlamentar } from '@/shared/db/schema'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { mapTseBem } from './bem-mapper'
import { tseBemRecordSchema } from './bem-schema'
import { mapTseCandidatura } from './candidatura-mapper'
import { tseCandidaturaRecordSchema } from './candidatura-schema'
import { parseCsv, rowsToRecords } from './csv'
import { downloadTseCsv } from './tse-client'

// Ingestão da declaração de bens do TSE — Eixo 2.
// Vínculo SOMENTE por CPF exato (L2); sem heurística; Câmara-only (Senado não
// publica CPF). Multi-ano: por padrão ingere 2014, 2018 e 2022 (os pleitos que
// habilitam as Camadas A/B/C); `ANO=YYYY` no env restringe a um único ano.
//
// Fonte ÚNICA (TSE), dois arquivos por ano: bem_candidato_AAAA (raiz L1, sem
// CPF, só SQ_CANDIDATO) + consulta_cand_AAAA (NR_CPF_CANDIDATO = ponte).
//
// Idempotência (princípio 5): DELETE-by-ano + bulk INSERT em transação por ano.
// Resiliência: cada ano é isolado — flakiness do CDN num ano não derruba os
// outros (APIs públicas BR são instáveis — CLAUDE.md).

// Pleitos cobertos por padrão. O vínculo CPF liga as candidaturas de TODOS os
// anos de um parlamentar atual → habilita a trajetória patrimonial (Camada B).
const ANOS_PADRAO = [2014, 2018, 2022] as const

// CD_CARGO do TSE: 5 = Senador, 6 = Deputado Federal. Restringe ao Legislativo
// federal (escopo da tabela parlamentar). Bens são filtrados ao conjunto de
// SQ_CANDIDATO federais (o arquivo de bens não tem coluna de cargo).
const CARGOS_FEDERAIS = new Set([5, 6])

const CHUNK = 500

function bemSource(ano: number): { zip: string; csv: string } {
  return {
    zip: `https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_${ano}.zip`,
    csv: `bem_candidato_${ano}_BRASIL.csv`,
  }
}

function candSource(ano: number): { zip: string; csv: string } {
  return {
    zip: `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`,
    csv: `consulta_cand_${ano}_BRASIL.csv`,
  }
}

interface AnoStats {
  ano: number
  candidaturasFederais: number
  candidaturasVinculadas: number
  candidaturasRejeitadas: number
  bensFederais: number
  bensRejeitados: number
  linhasPuladas: number
}

interface IngestionStats {
  parlamentaresComCpf: number
  anos: AnoStats[]
  errors: Array<{ context: string; reason: string }>
}

// Índice cpf → parlamentar_id (só Câmara, só com cpf preenchido). Sem CPF na
// ponta `parlamentar`, o vínculo casa zero — rode `npm run backfill:camara:cpf`.
async function loadCpfIndex(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, cpf: parlamentar.cpf })
    .from(parlamentar)
    .where(and(eq(parlamentar.casa, 'CAMARA'), isNotNull(parlamentar.cpf)))
  const index = new Map<string, string>()
  for (const r of rows) {
    if (r.cpf) index.set(r.cpf, r.id)
  }
  return index
}

type CandidaturaInsert = typeof tseCandidatura.$inferInsert
type BemInsert = typeof tseBemCandidato.$inferInsert

// Ingere um único ano (candidaturas federais + bens), idempotente por ano.
async function ingestAno(
  ano: number,
  cpfIndex: Map<string, string>,
): Promise<AnoStats> {
  const stats: AnoStats = {
    ano,
    candidaturasFederais: 0,
    candidaturasVinculadas: 0,
    candidaturasRejeitadas: 0,
    bensFederais: 0,
    bensRejeitados: 0,
    linhasPuladas: 0,
  }

  // ── 1. Candidaturas federais — dedupe por (ano, sq) ───────────────────────
  const cand = candSource(ano)
  const candRecords = rowsToRecords(
    parseCsv(await downloadTseCsv(cand.zip, cand.csv)),
    () => {
      stats.linhasPuladas++
    },
  )
  const federalSqs = new Set<number>()
  const candByKey = new Map<number, CandidaturaInsert>()
  for (const rec of candRecords) {
    const parsed = tseCandidaturaRecordSchema.safeParse(rec)
    if (!parsed.success) {
      stats.candidaturasRejeitadas++
      continue
    }
    const row = mapTseCandidatura(parsed.data, cand.zip)
    if (!CARGOS_FEDERAIS.has(row.cdCargo)) continue
    stats.candidaturasFederais++
    federalSqs.add(row.sqCandidato)
    const parlamentarId = row.cpf ? (cpfIndex.get(row.cpf) ?? null) : null
    if (parlamentarId) stats.candidaturasVinculadas++
    candByKey.set(row.sqCandidato, { ...row, parlamentarId })
  }

  await db.transaction(async (tx) => {
    await tx.delete(tseCandidatura).where(eq(tseCandidatura.anoEleicao, ano))
    const values = [...candByKey.values()]
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(tseCandidatura).values(values.slice(i, i + CHUNK))
    }
  })

  // ── 2. Bens (restritos ao conjunto federal) — dedupe por (ano, sq, ordem) ─
  const bem = bemSource(ano)
  const bemRecords = rowsToRecords(
    parseCsv(await downloadTseCsv(bem.zip, bem.csv)),
    () => {
      stats.linhasPuladas++
    },
  )
  const bemByKey = new Map<string, BemInsert>()
  for (const rec of bemRecords) {
    const parsed = tseBemRecordSchema.safeParse(rec)
    if (!parsed.success) {
      stats.bensRejeitados++
      continue
    }
    const row = mapTseBem(parsed.data, bem.zip)
    if (!federalSqs.has(row.sqCandidato)) continue
    stats.bensFederais++
    bemByKey.set(`${row.sqCandidato}:${row.nrOrdemBem}`, row)
  }

  await db.transaction(async (tx) => {
    await tx.delete(tseBemCandidato).where(eq(tseBemCandidato.anoEleicao, ano))
    const values = [...bemByKey.values()]
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(tseBemCandidato).values(values.slice(i, i + CHUNK))
    }
  })

  return stats
}

export async function ingestBensTse(
  anos: readonly number[] = ANOS_PADRAO,
): Promise<IngestionStats> {
  const cpfIndex = await loadCpfIndex()
  const stats: IngestionStats = {
    parlamentaresComCpf: cpfIndex.size,
    anos: [],
    errors: [],
  }
  if (cpfIndex.size === 0) {
    stats.errors.push({
      context: 'cpf-index',
      reason:
        'Nenhum parlamentar CAMARA com cpf — rode `npm run backfill:camara:cpf` primeiro; o vínculo ficará vazio',
    })
  }

  // Anos isolados: um ano que falhe (ex.: CDN do TSE fora) não impede os demais.
  for (const ano of anos) {
    try {
      stats.anos.push(await ingestAno(ano, cpfIndex))
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
ingestBensTse(anos)
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    const bensTotal = stats.anos.reduce((a, s) => a + s.bensFederais, 0)
    console.log(
      JSON.stringify({
        event: 'ingest_bens_tse_done',
        durationMs,
        anosIngeridos: anos,
        parlamentaresComCpf: stats.parlamentaresComCpf,
        bensFederaisTotal: bensTotal,
        porAno: stats.anos,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Só falha se houve erro E nada foi inserido (mesma política das demais).
    process.exit(stats.errors.length > 0 && bensTotal === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_bens_tse_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
