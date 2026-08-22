import { z } from 'zod'

import journalRaw from '@/shared/db/migrations/meta/_journal.json'

// TTLs em segundos espelhando a tabela do ADR-018.
export const TTL = {
  parlamentarPerfil: 3600,
  votacaoRecente: 3600,
  votacaoHistorica: 604_800,
  proposicaoEmTramitacao: 21_600,
  proposicaoArquivada: 604_800,
  // Stats globais de proposições (StatsGrid hero da listagem /proposicoes,
  // Wave 8 Sprint 8.0 PR2). Mesma cadência do cron de ingestão de
  // proposições — 6h é hora-redonda e alinhada com proposicaoEmTramitacao.
  proposicoesStatsGlobais: 21_600,
  // Cross-links de proposições relacionadas no footer do detalhe (Wave 8
  // Sprint 8.0 PR3, consumido em 8.2 PR5). 1h é mais curto que stats
  // globais porque catálogo de autores muda mais frequentemente (proposições
  // novas surgem diariamente e podem entrar nas listas top-5 por autor).
  proposicoesRelacionadas: 3_600,
  // Stats globais de votações (StatsGrid/KpiStrip do hero da listagem
  // /votacoes, Wave 9 Sprint 9.1). Mesma cadência de proposicoesStatsGlobais
  // — 6h alinha com cron de ingestão de votações.
  votacoesStatsGlobais: 21_600,
  // Stats agregadas consumidas por componentes server-side em rotas públicas
  // (home cards, OGs de listagem). 6h alinha com cron de ingestão de votações
  // (4×/dia) — mesma cadência de proposicoesStatsGlobais.
  publicStats: 21_600,
  gastoAnoCorrente: 21_600,
  filiacaoHistorica: 86_400,
  alinhamentoPartidario: 86_400,
  partidoOverview: 21_600,
  compararParlamentares: 3_600,
  // Snapshot patrimonial (Eixo 2 Camada A — declaração de bens TSE). Dado
  // quase-estático: o TSE reedita declarações no máximo em ciclo mensal e a
  // ingestão é mensal — 24h é folgado, barato e bem acima do horizonte de
  // mudança real.
  patrimonioDeclarado: 86_400,
  // Relatorias (ADR-044): ingestão semanal → 24h de cache é folgado e barato.
  relatorias: 86_400,
  // Discursos (ADR-048): ingestão semanal → 24h.
  discursos: 86_400,
  // Lideranças, blocos e frentes (ADR-056): ingestão mensal → 24h de cache
  // é folgado e muito abaixo do horizonte de mudança real.
  liderancas: 86_400,
  // Afastamentos e licenças de senadores (ADR-058): ingestão mensal → 24h.
  afastamentos: 86_400,
  // Vetos presidenciais (ADR-059): ingestão mensal → 24h. Dispositivos e votos
  // raramente mudam depois que o resultado é apurado.
  vetos: 86_400,
  // Mandatos externos de deputados (Sprint 14.0, G11): ingestão mensal → 24h.
  mandatosExternos: 86_400,
  // Emendas parlamentares (ADR-066): ingestão mensal (bulk CGU) → 24h.
  emendas: 86_400,
  // Comissionados de gabinete (ADR-064 E2): ingestão mensal → 24h.
  gabinete: 86_400,
  // Rankings de transparência (Sprint 16.0): gastos CEAP e alinhamento.
  // Dado de estatistica_parlamentar_agregada — atualizado pelo seed diário → 24h.
  rankings: 86_400,
  // Pares de votos em direções opostas (coerência, ADR-054). Só mudam quando
  // nova votação nominal é ingerida (cron diário) → 6h é folgado. Consumido
  // pela rota /contradicao (page + OG, martelada por scrapers) e pelo perfil.
  coerenciaPares: 21_600,
  // Listagens filtradas e busca. Era 300s (freshness herdada da Wave 2, quando
  // o custo de miss era teórico); o dado só muda no cron diário de ingestão e
  // o keyspace de filtros é enorme (~1M permutações em /proposicoes) sobre um
  // cache por colo que ainda é zerado a cada deploy — na prática quase todo
  // hit era miss (incidente #768). 1h corta os misses de repetição em 12× sem
  // freshness perceptível a menos que a ingestão rode no meio da janela.
  listagemFiltrada: 3_600,
} as const

export type TtlKey = keyof typeof TTL

export interface CacheStats {
  hits: number
  misses: number
  errors: number
  bypass: number
}

const journalSchema = z.object({
  version: z.string(),
  dialect: z.string(),
  entries: z
    .array(
      z.object({
        idx: z.number(),
        tag: z.string(),
        when: z.number().optional(),
      }),
    )
    .min(1),
})

function resolveSchemaVersion(): string {
  try {
    const journal = journalSchema.parse(journalRaw)
    const last = journal.entries[journal.entries.length - 1]
    if (!last) return 'v0000'
    // tag tem formato "0004_curly_forge" — extraímos só "0004" e prefixamos
    // com 'v' para a key ficar visualmente óbvia em logs.
    const idx = last.tag.split('_')[0] ?? '0000'
    return `v${idx}`
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: 'cache_journal_parse_failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    )
    return 'v0000'
  }
}

// CF_VERSION_METADATA é binding (objeto) em Cloudflare Workers, não env var.
// Algumas pipelines expõem como env string; caímos para GITHUB_SHA do CI.
// 'dev' garante que cache local não colida com o de outros ambientes.
function resolveBuildVersion(): string {
  const env = process.env as Record<string, string | undefined>
  const candidate = env.CF_VERSION_METADATA ?? env.GITHUB_SHA
  if (!candidate) return 'dev'
  return candidate.slice(0, 7)
}

const SCHEMA_VERSION = resolveSchemaVersion()
const BUILD_VERSION = resolveBuildVersion()

// Counter in-process por isolate. Reseta a cada cold start;
// suficiente para validar que cache está hittando. Em Wave 3+,
// quando volume justificar, migrar para Cloudflare Analytics
// Engine para hit rate agregado cross-isolate.
const stats: CacheStats = { hits: 0, misses: 0, errors: 0, bypass: 0 }

// Não usamos o tipo global `Cache` do lib.dom porque CacheStorage de browser
// tem shape diferente do Workers (open(), keys() etc.). Aqui modelamos só o
// subconjunto que de fato usamos.
interface CfCache {
  match(req: Request): Promise<Response | undefined>
  put(req: Request, res: Response): Promise<void>
  delete(req: Request): Promise<boolean>
}

function getDefaultCache(): CfCache | null {
  const c = (
    globalThis as unknown as {
      caches?: { default?: CfCache }
    }
  ).caches
  return c?.default ?? null
}

function buildCacheRequest(key: string): Request {
  const url = `https://cache.local/${SCHEMA_VERSION}/${BUILD_VERSION}/${encodeURIComponent(key)}`
  return new Request(url)
}

function logCacheError(event: string, key: string, err: unknown): void {
  console.warn(
    JSON.stringify({
      event,
      key,
      message: err instanceof Error ? err.message : String(err),
    }),
  )
}

// Wrapper de cache. Garantias:
//   1. Em cache hit, `loader` NÃO é chamado.
//   2. Em cache miss/erro de leitura, `loader` é chamado e o resultado é
//      cacheado por `ttl` segundos via header Cache-Control.
//   3. Se `caches.default` não existe (Node/dev/CI), chama loader direto.
//   4. Valor cacheado é JSON-roundtripped: `Date` vira string ISO no
//      consumo. Caller é responsável pela conversão se precisar de Date.
//      ⚠️ NUNCA retorne `Map`/`Set` do loader: JSON.stringify(new Map())
//      é `{}` — funciona no MISS e explode no HIT ("get is not a function"),
//      e o bypass em dev/CI (garantia 3) esconde o bug até produção
//      (perfis truncados em prod por 1 mês — frentes:name-to-id, sprint 26).
//      Retorne entries/arrays e reconstrua a estrutura FORA do cached().
//   5. Erro do `loader` propaga; nada é cacheado.
export async function cached<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cache = getDefaultCache()
  if (!cache) {
    stats.bypass++
    return loader()
  }

  const req = buildCacheRequest(key)

  try {
    const hit = await cache.match(req)
    if (hit) {
      stats.hits++
      return (await hit.json()) as T
    }
  } catch (err) {
    stats.errors++
    logCacheError('cache_read_failed', key, err)
  }

  stats.misses++
  // TODO(investigate-neon-wake): remover quando ofensor identificado.
  // Ver docs/ops/INVESTIGATE-NEON-WAKE.md. Sem ua/path: a versão atual
  // de @opennextjs/cloudflare expõe getCloudflareContext() mas não o
  // Request corrente — cruze cf_ray via log do middleware.
  console.log(
    JSON.stringify({
      event: 'cache_miss',
      key,
      ttl,
      schemaVersion: SCHEMA_VERSION,
      buildVersion: BUILD_VERSION,
    }),
  )
  const fresh = await loader()

  try {
    const res = new Response(JSON.stringify(fresh), {
      headers: {
        'cache-control': `max-age=${ttl}`,
        'content-type': 'application/json',
      },
    })
    await cache.put(req, res)
  } catch (err) {
    stats.errors++
    logCacheError('cache_write_failed', key, err)
  }

  return fresh
}

// Invalida uma chave específica. Usado pelo webhook de revalidação
// pós-ingestão (Ciclo 3 do Batch B). No-op silencioso quando
// `caches.default` não existe.
export async function invalidate(key: string): Promise<void> {
  const cache = getDefaultCache()
  if (!cache) return
  const req = buildCacheRequest(key)
  try {
    await cache.delete(req)
  } catch (err) {
    stats.errors++
    logCacheError('cache_invalidate_failed', key, err)
  }
}

export function readCacheStats(): CacheStats {
  return { ...stats }
}
