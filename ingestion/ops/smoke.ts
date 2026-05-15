import { z } from 'zod'

import {
  aggregateProbeResults,
  type ProbeResult,
  validateOgImageCanonical,
} from './smoke-aggregator'

const envSchema = z.object({
  SMOKE_BASE_URL: z.string().url('SMOKE_BASE_URL deve ser uma URL válida'),
})

type Probe = {
  name: string
  path: string
  concurrency: number
  expectedStatuses: readonly number[]
}

const PROBES: readonly Probe[] = [
  {
    name: 'health',
    path: '/api/health',
    concurrency: 5,
    expectedStatuses: [200],
  },
  {
    name: 'parlamentares-list',
    path: '/parlamentares',
    concurrency: 10,
    expectedStatuses: [200],
  },
  {
    name: 'proposicoes-list',
    path: '/proposicoes',
    concurrency: 10,
    expectedStatuses: [200],
  },
  {
    name: 'votacoes-list',
    path: '/votacoes',
    concurrency: 10,
    expectedStatuses: [200],
  },
  {
    name: 'export-parlamentares',
    path: '/api/export/parlamentares?casa=CAMARA',
    concurrency: 5,
    expectedStatuses: [200],
  },
  {
    name: 'stats-unauthed',
    path: '/api/stats',
    concurrency: 5,
    expectedStatuses: [401, 503],
  },
] as const

// Rotas verificadas para OG canônico no smoke. Cobertura: home, listas e
// detalhes (cada um pode ter `opengraph-image.tsx` próprio ou herdar do
// fallback global). Guarda contra regressão da Tarefa 1.1 do Sprint 3.0
// (metadataBase localhost vazando em prod).
const OG_ROUTES = [
  '/',
  '/parlamentares',
  '/proposicoes',
  '/votacoes',
  '/comparar',
  '/docs',
] as const

const SUCCESS_THRESHOLD_PERCENT = 99
const WARMUP_DELAY_MS = 5_000

async function fetchStatus(url: string): Promise<number> {
  try {
    const res = await fetch(url, { redirect: 'manual' })
    return res.status
  } catch {
    return -1
  }
}

async function runProbe(baseUrl: string, probe: Probe) {
  const url = `${baseUrl}${probe.path}`
  const statuses = await Promise.all(
    Array.from({ length: probe.concurrency }, () => fetchStatus(url)),
  )
  return aggregateProbeResults(probe.name, statuses, probe.expectedStatuses)
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status !== 200) return null
    return await res.text()
  } catch {
    return null
  }
}

/**
 * Probe específico para validar OG canônico em rotas representativas.
 * Retorna um ProbeResult compatível para integração com a saída do smoke.
 * Falha quando qualquer rota retorna og:image com `localhost` ou apontando
 * para outro domínio.
 */
async function runOgCanonicalProbe(
  baseUrl: string,
  paths: readonly string[],
): Promise<
  ProbeResult & { failures: Array<{ path: string; reason: string }> }
> {
  const failures: Array<{ path: string; reason: string }> = []
  let expected = 0
  let errors = 0
  const counts: Record<string, number> = {}

  for (const path of paths) {
    const html = await fetchHtml(`${baseUrl}${path}`)
    if (html === null) {
      errors++
      counts.error = (counts.error ?? 0) + 1
      failures.push({ path, reason: 'fetch falhou ou status != 200' })
      continue
    }
    const result = validateOgImageCanonical(html, baseUrl)
    if (result.ok) {
      expected++
      counts.canonical = (counts.canonical ?? 0) + 1
    } else {
      counts.invalid = (counts.invalid ?? 0) + 1
      failures.push({ path, reason: result.reason })
    }
  }

  const total = paths.length
  const unexpected = total - expected - errors
  const successRate = total === 0 ? 0 : (expected / total) * 100

  return {
    name: 'og-canonical',
    total,
    expected,
    unexpected,
    errors,
    successRate: Math.round(successRate * 100) / 100,
    statuses: counts,
    failures,
  }
}

async function main() {
  const envResult = envSchema.safeParse(process.env)
  if (!envResult.success) {
    const reason = envResult.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    console.error(JSON.stringify({ event: 'smoke_env_invalid', reason }))
    process.exit(2)
  }
  const baseUrl = envResult.data.SMOKE_BASE_URL.replace(/\/$/, '')

  console.log(
    JSON.stringify({
      event: 'smoke_start',
      baseUrl,
      probes: PROBES.length + 1, // +1 = og-canonical
    }),
  )

  // Aguarda propagação eventual do Worker pelo edge da Cloudflare antes do
  // primeiro probe — evita falso negativo de smoke ter rodado contra a
  // versão anterior do bundle.
  await new Promise((resolve) => setTimeout(resolve, WARMUP_DELAY_MS))

  const results = await Promise.all(PROBES.map((p) => runProbe(baseUrl, p)))

  let totalRequests = 0
  let totalExpected = 0
  for (const r of results) {
    console.log(JSON.stringify({ event: 'smoke_probe_result', ...r }))
    totalRequests += r.total
    totalExpected += r.expected
  }

  const ogResult = await runOgCanonicalProbe(baseUrl, OG_ROUTES)
  console.log(JSON.stringify({ event: 'smoke_probe_result', ...ogResult }))
  totalRequests += ogResult.total
  totalExpected += ogResult.expected
  // Falha rígida para OG: qualquer rota com og:image localhost ou
  // apontando fora do domínio é regressão crítica (não cabe na taxa
  // de 99% genérica). Falha o smoke independentemente do threshold.
  const ogFailed = ogResult.expected < ogResult.total

  const overallSuccessRate =
    totalRequests === 0 ? 0 : (totalExpected / totalRequests) * 100
  const passed = overallSuccessRate >= SUCCESS_THRESHOLD_PERCENT && !ogFailed

  console.log(
    JSON.stringify({
      event: passed ? 'smoke_passed' : 'smoke_failed',
      totalRequests,
      totalExpected,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      threshold: SUCCESS_THRESHOLD_PERCENT,
      ogCanonicalFailed: ogFailed,
      ...(ogFailed ? { ogFailures: ogResult.failures } : {}),
    }),
  )

  if (!passed) process.exit(1)
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'smoke_crashed',
      message: err instanceof Error ? err.message : String(err),
    }),
  )
  process.exit(2)
})
