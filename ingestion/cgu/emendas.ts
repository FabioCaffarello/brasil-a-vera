import { emendaParlamentar } from '@/modules/orcamento/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { db } from '../shared/db'
import { createCsvRecordStream } from '../tse/csv'
import { streamTseZipEntries } from '../tse/tse-client'
import {
  centavosParaNumeric,
  createEmendaAggregator,
  criarVinculadorAutores,
  type EmendaAgregada,
  mapEmenda,
} from './emendas-mapper'
import { cguEmendaRecordSchema } from './emendas-schema'

// Ingestão de emendas parlamentares (ADR-066) — bulk download do Portal da
// Transparência (CGU), sem token. O alias /UNICO responde 302 para o host de
// arquivos (dadosabertos-download.cgu.gov.br); o fetch segue o redirect.
//
// Do zip (32 MB) processamos apenas EmendasParlamentares.csv (47 MB desc.,
// Latin-1, ';') em streaming — _Convenios e _PorFavorecido ficam fora de
// escopo (ADR-066, alternativa C). Persistimos emendas INDIVIDUAIS de 2015+
// com autor vinculado a parlamentar por nome oficial (fail-closed em
// ambiguidade — ADR-066 D3); a taxa de match por ano vai no log estruturado.
//
// Idempotência (princípio 5 / ADR-014): o arquivo é snapshot completo e anos
// antigos mudam retroativamente (restos a pagar) → DELETE integral + bulk
// INSERT em transação a cada run mensal.

const ZIP_URL =
  'https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO'

const CSV_ENTRY = 'EmendasParlamentares.csv'

const CHUNK = 500

interface IngestionStats {
  parlamentaresCarregados: number
  nomesAmbiguos: number
  linhasLidas: number
  linhasRejeitadas: number
  linhasPuladas: number
  descartes: Record<string, number>
  emendasInseridas: number
  matchPorAno: Record<number, { vinculadas: number; semMatch: number }>
  autoresSemMatchCount: number
  autoresSemMatchSample: string[]
}

type EmendaInsert = typeof emendaParlamentar.$inferInsert

function toInsert(e: EmendaAgregada): EmendaInsert {
  return {
    parlamentarId: e.parlamentarId,
    codigoEmenda: e.codigoEmenda,
    ano: e.ano,
    tipoEmenda: e.tipoEmenda,
    autorCodigo: e.autorCodigo,
    autorNome: e.autorNome,
    localidade: e.localidade,
    municipioIbgeCodigo: e.municipioIbgeCodigo,
    municipioNome: e.municipioNome,
    uf: e.uf,
    valorEmpenhado: centavosParaNumeric(e.centavosEmpenhado),
    valorLiquidado: centavosParaNumeric(e.centavosLiquidado),
    valorPago: centavosParaNumeric(e.centavosPago),
    valorRapInscritos: centavosParaNumeric(e.centavosRapInscritos),
    valorRapPagos: centavosParaNumeric(e.centavosRapPagos),
    trustLevel: 'L1',
    sourceUrl: ZIP_URL,
  }
}

export async function ingestEmendas(): Promise<IngestionStats> {
  const parlamentares = await db
    .select({
      id: parlamentar.id,
      nome: parlamentar.nome,
      nomeCivil: parlamentar.nomeCivil,
    })
    .from(parlamentar)
  if (parlamentares.length === 0) {
    throw new Error(
      'Tabela parlamentar vazia — rode as ingestões de parlamentares primeiro',
    )
  }

  const vinculador = criarVinculadorAutores(parlamentares)
  const aggregator = createEmendaAggregator(vinculador)
  const stats: IngestionStats = {
    parlamentaresCarregados: parlamentares.length,
    nomesAmbiguos: vinculador.ambiguos().length,
    linhasLidas: 0,
    linhasRejeitadas: 0,
    linhasPuladas: 0,
    descartes: {},
    emendasInseridas: 0,
    matchPorAno: {},
    autoresSemMatchCount: 0,
    autoresSemMatchSample: [],
  }

  const processed = await streamTseZipEntries(
    ZIP_URL,
    (name) => name === CSV_ENTRY,
    () => {
      const records = createCsvRecordStream(
        (record) => {
          stats.linhasLidas++
          const parsed = cguEmendaRecordSchema.safeParse(record)
          if (!parsed.success) {
            stats.linhasRejeitadas++
            return
          }
          const motivo = aggregator.add(mapEmenda(parsed.data))
          if (motivo !== null) {
            stats.descartes[motivo] = (stats.descartes[motivo] ?? 0) + 1
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
  if (processed.length === 0) {
    throw new Error(`${CSV_ENTRY} não encontrado no zip (${ZIP_URL})`)
  }

  const values = aggregator.snapshot().map(toInsert)

  await db.transaction(async (tx) => {
    // Snapshot completo da fonte → repõe a tabela inteira (ver nota no topo).
    await tx.delete(emendaParlamentar)
    for (let i = 0; i < values.length; i += CHUNK) {
      await tx.insert(emendaParlamentar).values(values.slice(i, i + CHUNK))
    }
  })

  stats.emendasInseridas = values.length
  stats.matchPorAno = aggregator.matchPorAno()
  const semMatch = aggregator.autoresSemMatch()
  stats.autoresSemMatchCount = semMatch.length
  stats.autoresSemMatchSample = semMatch.slice(0, 10)
  return stats
}

const started = Date.now()
ingestEmendas()
  .then((stats) => {
    console.log(
      JSON.stringify({
        event: 'ingest_emendas_done',
        durationMs: Date.now() - started,
        ...stats,
      }),
    )
    // Falha se nada foi inserido (fonte vazia/quebrada nunca passa em silêncio).
    process.exit(stats.emendasInseridas === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_emendas_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
