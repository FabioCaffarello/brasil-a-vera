import { z } from 'zod'

import { aggregateProbeResults } from './smoke-aggregator'

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
    JSON.stringify({ event: 'smoke_start', baseUrl, probes: PROBES.length }),
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

  const overallSuccessRate =
    totalRequests === 0 ? 0 : (totalExpected / totalRequests) * 100
  const passed = overallSuccessRate >= SUCCESS_THRESHOLD_PERCENT

  console.log(
    JSON.stringify({
      event: passed ? 'smoke_passed' : 'smoke_failed',
      totalRequests,
      totalExpected,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      threshold: SUCCESS_THRESHOLD_PERCENT,
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
