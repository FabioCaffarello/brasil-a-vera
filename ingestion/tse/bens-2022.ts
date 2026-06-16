import { and, eq, isNotNull } from 'drizzle-orm'
import {
  tseBemCandidato,
  tseCandidatura,
} from '@/modules/eleitoral/domain/schema'
import { parlamentar } from '@/shared/db/schema'
import { db } from '../shared/db'
import { mapTseBem } from './bem-mapper'
import { tseBemRecordSchema } from './bem-schema'
import { mapTseCandidatura } from './candidatura-mapper'
import { tseCandidaturaRecordSchema } from './candidatura-schema'
import { parseCsv, rowsToRecords } from './csv'
import { downloadTseCsv } from './tse-client'

// Ingestão da declaração de bens do TSE — Eixo 2, Incremento 0.
// Escopo TRAVADO: SOMENTE eleição 2022; vínculo SOMENTE por CPF exato (L2);
// sem heurística; Camada A = Câmara-only (Senado não publica CPF).
//
// Fonte ÚNICA (TSE), dois arquivos do mesmo dataset:
//  - bem_candidato_2022: a raiz L1 dos bens (NÃO tem CPF, só SQ_CANDIDATO).
//  - consulta_cand_2022: traz NR_CPF_CANDIDATO, a ponte para parlamentar.cpf.
//
// Idempotência (princípio 5): DELETE-by-ano + bulk INSERT em transação, para
// ambas as tabelas — substituição em massa do ano, captura edições retroativas
// do TSE.

const ANO = 2022
const BEM_ZIP =
  'https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2022.zip'
const BEM_CSV = 'bem_candidato_2022_BRASIL.csv'
const CAND_ZIP =
  'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip'
const CAND_CSV = 'consulta_cand_2022_BRASIL.csv'

// CD_CARGO do TSE: 5 = Senador, 6 = Deputado Federal. Restringimos as
// candidaturas ao Legislativo federal — escopo da tabela parlamentar. Bens
// são filtrados ao conjunto de SQ_CANDIDATO federais resultante (o arquivo de
// bens não tem coluna de cargo).
const CARGOS_FEDERAIS = new Set([5, 6])

const CHUNK = 500

interface IngestionStats {
  candidaturasLidas: number
  candidaturasFederais: number
  candidaturasVinculadas: number
  candidaturasRejeitadas: number
  bensLidos: number
  bensFederais: number
  bensRejeitados: number
  linhasPuladas: number
  parlamentaresComCpf: number
  errors: Array<{ context: string; reason: string }>
}

// Carrega o índice cpf → parlamentar_id (só Câmara, só com cpf preenchido).
// Sem CPF na ponta `parlamentar`, o vínculo casa zero — rode antes
// `npm run backfill:camara:cpf`.
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

export async function ingestBensTse(): Promise<IngestionStats> {
  const stats: IngestionStats = {
    candidaturasLidas: 0,
    candidaturasFederais: 0,
    candidaturasVinculadas: 0,
    candidaturasRejeitadas: 0,
    bensLidos: 0,
    bensFederais: 0,
    bensRejeitados: 0,
    linhasPuladas: 0,
    parlamentaresComCpf: 0,
    errors: [],
  }

  const cpfIndex = await loadCpfIndex()
  stats.parlamentaresComCpf = cpfIndex.size
  if (cpfIndex.size === 0) {
    stats.errors.push({
      context: 'cpf-index',
      reason:
        'Nenhum parlamentar CAMARA com cpf — rode `npm run backfill:camara:cpf` primeiro; o vínculo ficará vazio',
    })
  }

  // ── 1. Candidaturas (federais) — dedupe por (ano, sq) ──────────────────
  const candText = await downloadTseCsv(CAND_ZIP, CAND_CSV)
  const candRecords = rowsToRecords(parseCsv(candText), () => {
    stats.linhasPuladas++
  })
  const federalSqs = new Set<number>()
  const candByKey = new Map<number, CandidaturaInsert>()
  for (const rec of candRecords) {
    stats.candidaturasLidas++
    const parsed = tseCandidaturaRecordSchema.safeParse(rec)
    if (!parsed.success) {
      stats.candidaturasRejeitadas++
      continue
    }
    const row = mapTseCandidatura(parsed.data, CAND_ZIP)
    if (!CARGOS_FEDERAIS.has(row.cdCargo)) continue
    stats.candidaturasFederais++
    federalSqs.add(row.sqCandidato)
    const parlamentarId = row.cpf ? (cpfIndex.get(row.cpf) ?? null) : null
    if (parlamentarId) stats.candidaturasVinculadas++
    candByKey.set(row.sqCandidato, { ...row, parlamentarId })
  }

  await db.transaction(async (tx) => {
    await tx.delete(tseCandidatura).where(eq(tseCandidatura.anoEleicao, ANO))
    const values = [...candByKey.values()]
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(tseCandidatura).values(values.slice(i, i + CHUNK))
    }
  })

  // ── 2. Bens (restritos ao conjunto federal) — dedupe por (ano, sq, ordem)
  const bemText = await downloadTseCsv(BEM_ZIP, BEM_CSV)
  const bemRecords = rowsToRecords(parseCsv(bemText), () => {
    stats.linhasPuladas++
  })
  const bemByKey = new Map<string, BemInsert>()
  for (const rec of bemRecords) {
    stats.bensLidos++
    const parsed = tseBemRecordSchema.safeParse(rec)
    if (!parsed.success) {
      stats.bensRejeitados++
      continue
    }
    const row = mapTseBem(parsed.data, BEM_ZIP)
    if (!federalSqs.has(row.sqCandidato)) continue
    stats.bensFederais++
    bemByKey.set(`${row.sqCandidato}:${row.nrOrdemBem}`, row)
  }

  await db.transaction(async (tx) => {
    await tx.delete(tseBemCandidato).where(eq(tseBemCandidato.anoEleicao, ANO))
    const values = [...bemByKey.values()]
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(tseBemCandidato).values(values.slice(i, i + CHUNK))
    }
  })

  return stats
}

const started = Date.now()
ingestBensTse()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_bens_tse_done',
        durationMs,
        ano: ANO,
        ...stats,
        errorsSample,
        errors: undefined,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Só falha se houve erro E nada foi inserido (mesma política das demais).
    process.exit(stats.errors.length > 0 && stats.bensFederais === 0 ? 1 : 0)
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
