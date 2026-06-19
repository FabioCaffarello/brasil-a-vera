import { eq } from 'drizzle-orm'

import { membroComissao, parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import {
  classificarColegiadoPorNome,
  dedupePorChaveNatural,
  type MembroComissaoRow,
} from '../shared/membro-comissao'
import {
  extractCodigoTipoSenado,
  mapMembroComissaoSenado,
} from './comissoes-mapper'
import {
  senadoColegiadoDetalheSchema,
  senadoComissoesEnvelopeSchema,
} from './comissoes-schema'
import { fetchSenadoJson } from './senado-client'

const CASA = 'SENADO' as const
const CONCURRENCY = 3
const PROGRESS_EVERY = 25
// Afordância de validação local: COMISSOES_LIMIT=N processa só os N primeiros
// senadores (amostra). Ausente em prod → processa todos.
const LIMIT = Number(process.env.COMISSOES_LIMIT) || undefined

interface IngestionStats {
  senadoresProcessados: number
  participacoesFetched: number
  comissoesUpserted: number
  naoComissaoSkipped: number
  // Classificadas pelo fallback de sigla porque o detalhe /comissao/{codigo}
  // não trouxe o tipo (colegiado extinto: CPIs/CPMIs encerradas etc.).
  classificadoPorSigla: number
  // Siglas DISTINTAS mantidas via fallback (não pelo tipo autoritativo). Como o
  // fallback é keep-by-default (fail-open), este conjunto é o ponto de auditoria:
  // tudo aqui deveria ser CPI/CPMI/colegiado extinto — não ruído.
  fallbackSiglas: Set<string>
  // Nomes DISTINTOS mantidos cujo nome não casa padrão positivo de comissão nem
  // deny — sinal operacional pareado ao teste de classificação. Em run saudável
  // são só os ratificados (INDETERMINADOS_COMISSAO); um nome novo aqui = família
  // a triar (a fixture do teste, atualizada, o pega como assert vermelho).
  indeterminados: Set<string>
  rejected: number
  tiposMantidos: Record<string, number>
  errors: Array<{ context: string; reason: string }>
}

async function loadParlamentares(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
}

interface ColegiadoTipo {
  codigoTipo: number | null
  descricao: string | null
}

// Cache de tipo de colegiado deduplicado entre todos os senadores. Guarda a
// Promise (in-flight dedup) — vários senadores compartilham as mesmas comissões.
function makeColegiadoCache() {
  const cache = new Map<string, Promise<ColegiadoTipo | null>>()

  async function fetchTipo(codigo: string): Promise<ColegiadoTipo | null> {
    const raw = await fetchSenadoJson<unknown>(`/comissao/${codigo}`)
    const parsed = senadoColegiadoDetalheSchema.safeParse(raw)
    if (!parsed.success) return null
    const codigoTipo = extractCodigoTipoSenado(parsed.data)
    const descricao =
      parsed.data.ComissoesCongressoNacional.Colegiados?.Colegiado?.[0]
        ?.TipoColegiado?.TipoColegiado ?? null
    return { codigoTipo, descricao }
  }

  return function getColegiadoTipo(
    codigo: string,
  ): Promise<ColegiadoTipo | null> {
    const cached = cache.get(codigo)
    if (cached) return cached
    const promise = fetchTipo(codigo)
    cache.set(codigo, promise)
    return promise
  }
}

async function processSenador(
  sen: { id: string; sourceId: string },
  getColegiadoTipo: (codigo: string) => Promise<ColegiadoTipo | null>,
  stats: IngestionStats,
): Promise<void> {
  const rows: MembroComissaoRow[] = []

  try {
    const raw = await fetchSenadoJson<unknown>(
      `/senador/${sen.sourceId}/comissoes`,
    )
    const parsed = senadoComissoesEnvelopeSchema.safeParse(raw)
    if (!parsed.success) {
      stats.rejected++
      stats.errors.push({
        context: `sen=${sen.sourceId}`,
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      return
    }

    const participacoes =
      parsed.data.MembroComissaoParlamentar.Parlamentar.MembroComissoes
        ?.Comissao ?? []

    for (const participacao of participacoes) {
      stats.participacoesFetched++
      const codigo = participacao.IdentificacaoComissao.CodigoComissao
      const tipo = await getColegiadoTipo(codigo)
      // codigoTipo null (detalhe vazio/extinto) → o mapper classifica pela
      // sigla. Nunca descartamos a participação só por falta de detalhe (#481).
      const codigoTipo = tipo?.codigoTipo ?? null

      const row = mapMembroComissaoSenado(participacao, codigoTipo, sen.id)
      if (row === null) {
        stats.naoComissaoSkipped++
        continue
      }
      if (codigoTipo === null) {
        stats.classificadoPorSigla++
        stats.fallbackSiglas.add(
          participacao.IdentificacaoComissao.SiglaComissao,
        )
        stats.tiposMantidos['fallback:sigla'] =
          (stats.tiposMantidos['fallback:sigla'] ?? 0) + 1
      } else {
        const chave = tipo?.descricao ?? `cod:${codigoTipo}`
        stats.tiposMantidos[chave] = (stats.tiposMantidos[chave] ?? 0) + 1
      }
      if (classificarColegiadoPorNome(row.comissaoNome) === 'indeterminado') {
        stats.indeterminados.add(row.comissaoNome)
      }
      rows.push(row)
    }
  } catch (err) {
    stats.errors.push({
      context: `sen=${sen.sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const deduped = dedupePorChaveNatural(rows)

  // Idempotência por parlamentar (princípio 5, substituição em massa).
  await db.transaction(async (tx) => {
    await tx
      .delete(membroComissao)
      .where(eq(membroComissao.parlamentarId, sen.id))
    if (deduped.length > 0) {
      await tx.insert(membroComissao).values(deduped)
    }
  })

  stats.senadoresProcessados++
  stats.comissoesUpserted += deduped.length

  if (stats.senadoresProcessados % PROGRESS_EVERY === 0) {
    console.log(
      JSON.stringify({
        event: 'ingest_comissoes_senado_progress',
        senadoresProcessados: stats.senadoresProcessados,
        comissoesUpserted: stats.comissoesUpserted,
        naoComissaoSkipped: stats.naoComissaoSkipped,
        errosAteAgora: stats.errors.length,
      }),
    )
  }
}

export async function ingestComissoesSenado(): Promise<IngestionStats> {
  const todos = await loadParlamentares()
  if (todos.length === 0) {
    throw new Error(
      'Nenhum parlamentar SENADO no banco — rode `npm run ingest:senado:senadores` primeiro',
    )
  }
  const senadores = LIMIT ? todos.slice(0, LIMIT) : todos

  const stats: IngestionStats = {
    senadoresProcessados: 0,
    participacoesFetched: 0,
    comissoesUpserted: 0,
    naoComissaoSkipped: 0,
    classificadoPorSigla: 0,
    fallbackSiglas: new Set(),
    indeterminados: new Set(),
    rejected: 0,
    tiposMantidos: {},
    errors: [],
  }

  const getColegiadoTipo = makeColegiadoCache()

  await runWithConcurrency(
    senadores,
    async (sen) => {
      await processSenador(sen, getColegiadoTipo, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestComissoesSenado()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_comissoes_senado_done',
        durationMs,
        senadoresProcessados: stats.senadoresProcessados,
        participacoesFetched: stats.participacoesFetched,
        comissoesUpserted: stats.comissoesUpserted,
        naoComissaoSkipped: stats.naoComissaoSkipped,
        classificadoPorSigla: stats.classificadoPorSigla,
        fallbackSiglas: [...stats.fallbackSiglas].sort(),
        indeterminados: [...stats.indeterminados].sort(),
        rejected: stats.rejected,
        tiposMantidos: stats.tiposMantidos,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Política unificada: só falha se houve erros E zero sucessos.
    process.exit(
      stats.errors.length > 0 && stats.comissoesUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_comissoes_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
