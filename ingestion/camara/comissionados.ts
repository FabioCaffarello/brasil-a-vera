import { eq } from 'drizzle-orm'

import {
  comissionadoGabinete,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import { db } from '../shared/db'
import { fetchWithRetry } from '../shared/http'
import { parseCsv, rowsToRecords } from '../tse/csv'
import { mapFuncionarioCamara } from './comissionados-mapper'
import { camaraFuncionarioRecordSchema } from './comissionados-schema'

// Ingestão de comissionados de gabinete da Câmara (ADR-064 v0.3, emenda E2).
// Fonte: CSV cru dos Dados Abertos (sem token). Vínculo DETERMINÍSTICO:
// uriLotacao referencia o deputado dono do gabinete na API v2 → casa com
// parlamentar.source_id (casa=CAMARA).
//
// Fase 1 SEM remuneração (decisão do owner 2026-07-16): a Câmara não publica
// a tabela remuneratória por nível em formato aberto — persistimos nome,
// grupo e nível do cargo; remuneracao_basica fica NULL.
//
// O CSV é snapshot do quadro ATUAL → DELETE-by-casa + INSERT em transação
// (princípio 5). UTF-8 COM BOM: strip obrigatório antes do parse.

const CSV_URL =
  'https://dadosabertos.camara.leg.br/arquivos/funcionarios/csv/funcionarios.csv'

const USER_AGENT =
  'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)'

const CASA = 'CAMARA' as const

const CHUNK = 500

interface ComissionadosStats {
  linhasLidas: number
  linhasPuladas: number
  linhasRejeitadas: number
  foraDeGabinete: number
  foraBaseParlamentar: number
  inseridos: number
  gabinetesDistintos: number
  sample: Array<{
    deputadoSourceId: string
    nome: string
    cargo: string | null
  }>
}

async function loadDeputadosPorSourceId(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
  if (rows.length === 0) {
    throw new Error(
      'Nenhum parlamentar CAMARA no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }
  return new Map(rows.map((r) => [r.sourceId, r.id]))
}

export async function ingestComissionadosCamara(): Promise<ComissionadosStats> {
  const deputadoPorSourceId = await loadDeputadosPorSourceId()

  const stats: ComissionadosStats = {
    linhasLidas: 0,
    linhasPuladas: 0,
    linhasRejeitadas: 0,
    foraDeGabinete: 0,
    foraBaseParlamentar: 0,
    inseridos: 0,
    gabinetesDistintos: 0,
    sample: [],
  }

  const response = await fetchWithRetry(CSV_URL, {
    headers: { accept: 'text/csv', 'user-agent': USER_AGENT },
  })
  // UTF-8 (não Latin-1 como o TSE). Strip do BOM: sem ele, o parser trataria
  // o BOM como parte da primeira chave do header e todo record quebraria.
  const text = (await response.text()).replace(/^\uFEFF/, '')

  const rows = parseCsv(text)
  const records = rowsToRecords(rows, () => {
    stats.linhasPuladas++
  })

  type Insert = typeof comissionadoGabinete.$inferInsert
  const values: Insert[] = []
  const gabinetes = new Set<string>()

  for (const record of records) {
    stats.linhasLidas++
    const parsed = camaraFuncionarioRecordSchema.safeParse(record)
    if (!parsed.success) {
      stats.linhasRejeitadas++
      continue
    }
    const mapped = mapFuncionarioCamara(parsed.data)
    if (mapped === null) {
      stats.foraDeGabinete++
      continue
    }
    const parlamentarId = deputadoPorSourceId.get(mapped.deputadoSourceId)
    if (!parlamentarId) {
      // Gabinete de ex-deputado fora da base — fora do recorte, sem erro.
      stats.foraBaseParlamentar++
      continue
    }
    gabinetes.add(parlamentarId)
    values.push({
      parlamentarId,
      casa: CASA,
      nome: mapped.nome,
      grupo: mapped.grupo,
      cargo: mapped.cargo,
      remuneracaoBasica: null,
      mesReferencia: null,
      sourceId: mapped.ponto,
      trustLevel: 'L1',
      sourceUrl: CSV_URL,
    })
    if (stats.sample.length < 3) {
      stats.sample.push({
        deputadoSourceId: mapped.deputadoSourceId,
        nome: mapped.nome,
        cargo: mapped.cargo,
      })
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(comissionadoGabinete)
      .where(eq(comissionadoGabinete.casa, CASA))
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(comissionadoGabinete).values(values.slice(i, i + CHUNK))
    }
  })

  stats.inseridos = values.length
  stats.gabinetesDistintos = gabinetes.size
  return stats
}

const started = Date.now()
ingestComissionadosCamara()
  .then((stats) => {
    console.log(
      JSON.stringify({
        event: 'ingest_comissionados_camara_done',
        durationMs: Date.now() - started,
        ...stats,
      }),
    )
    process.exit(stats.inseridos === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_comissionados_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
