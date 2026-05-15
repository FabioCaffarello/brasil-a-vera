import { readIngestEnv } from '../shared/env'
import { ingestProposicoesCamara } from './proposicoes-core'

// Entry-point CLI da ingestão de proposições Câmara. Toda a lógica e tipos
// vivem em `proposicoes-core.ts` — esse arquivo só dispara a execução.
// Padrão necessário para que outros módulos importem `ingestProposicaoBySourceId`
// sem ativar a ingestão completa no import (validado empiricamente em
// 2026-05-14: backfill importou `./proposicoes` e disparou 8719 fetches
// acidentais antes do split em core).

const started = Date.now()
const env = readIngestEnv()

ingestProposicoesCamara({
  dataInicio: env.DATA_INICIO,
  dataFim: env.DATA_FIM,
})
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_proposicoes_camara_done',
        durationMs,
        proposicoesFetched: stats.proposicoesFetched,
        proposicoesUpserted: stats.proposicoesUpserted,
        proposicoesSkippedTipo: stats.proposicoesSkippedTipo,
        proposicoesSkippedError: stats.proposicoesSkippedError,
        temasUpserted: stats.temasUpserted,
        autoresUpserted: stats.autoresUpserted,
        autoresSemMatch: stats.autoresSemMatch,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(
      stats.errors.length > 0 && stats.proposicoesUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_proposicoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
