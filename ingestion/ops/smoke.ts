import { createHash } from 'node:crypto'

import { z } from 'zod'

import {
  aggregateProbeResults,
  findDuplicateHashes,
  findMissingAnchors,
  hasRssDiscovery,
  type ProbeResult,
  validateDevRouteNoindex,
  validateOgImageCanonical,
  validateRssXml,
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
  // Wave 10 — rotas públicas da área logada (sign-in landing e
  // política de privacidade). /painel/* exige Clerk; smoke anônimo
  // só pode bater as públicas.
  {
    name: 'sign-in',
    path: '/sign-in',
    concurrency: 3,
    expectedStatuses: [200],
  },
  {
    name: 'privacidade',
    path: '/privacidade',
    concurrency: 3,
    expectedStatuses: [200],
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

// Strings âncora que precisam aparecer no HTML da home — guarda contra
// regressão silenciosa de cards removidos do JSX (audit pré-3.2 mostrou
// que status HTTP-only não pega esse caso). Sprint 3.1 hygiene.
const HOME_CARDS_ANCHORS = [
  'Quem está no Congresso',
  'Votações da semana',
  'A plataforma em números',
] as const

// Rotas OG fixas (listagens + global). Entidades amostrais são descobertas
// em runtime via DISCOVER_* (extração de IDs do HTML/RSS). Sprint 3.2 Tarefa 4.
const OG_LISTING_PATHS = [
  '/opengraph-image',
  '/parlamentares/opengraph-image',
  '/proposicoes/opengraph-image',
  '/votacoes/opengraph-image',
  '/partidos/PT/opengraph-image',
] as const

// Feeds RSS amostrais que precisam validar contra estrutura RSS 2.0.
// Subset deliberadamente pequeno (3) — testar 84 feeds inflaria o smoke
// sem ganho proporcional. Cobre global + segmentação por casa + por UF.
const RSS_VALID_PATHS = [
  '/feed/votacoes',
  '/feed/votacoes/casa/CAMARA',
  '/feed/votacoes/uf/SP',
] as const

// Páginas que devem expor `<link rel="alternate" type="application/rss+xml">`
// no head — discovery via metadata.alternates.types do Next. Sprint 3.2 Tarefa 4.
const RSS_DISCOVERY_PATHS = ['/votacoes', '/partidos/PT'] as const

// Conteúdo-âncora por sub-página de /docs. Cada string deve aparecer no HTML
// da página correspondente, senão é regressão silenciosa de conteúdo
// pedagógico removido (mesma classe do `home-anchors`). Sprint 3.2 Tarefa 4.
const DOCS_ANCHORS_BY_PATH: Record<string, readonly string[]> = {
  '/docs': ['Por onde começar', 'Como contribuir'],
  '/docs/piramide-de-confianca': [
    'Os quatro níveis',
    'Por que essa separação importa',
  ],
  '/docs/como-ler-um-perfil': [
    'Top afinidade de voto',
    'Alinhamento partidário',
  ],
  '/docs/glossario': ['Tipos de proposição', 'Tramitação'],
  '/docs/fontes': ['Princípio de rastreabilidade', 'Cobertura temporal'],
}

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

async function fetchTextWithType(
  url: string,
): Promise<{ body: string; contentType: string } | null> {
  try {
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status !== 200) return null
    const body = await res.text()
    return { body, contentType: res.headers.get('content-type') ?? '' }
  } catch {
    return null
  }
}

async function fetchPngHash(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status !== 200) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    return createHash('sha256').update(buf).digest('hex')
  } catch {
    return null
  }
}

async function fetchHtmlWithHeaders(
  url: string,
): Promise<{ html: string; headers: Headers } | null> {
  try {
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status !== 200) return null
    const html = await res.text()
    return { html, headers: res.headers }
  } catch {
    return null
  }
}

/**
 * Probe de presença textual de âncoras no HTML da home. Falha rígida
 * quando qualquer string esperada estiver ausente (guarda contra remoção
 * silenciosa de componentes do JSX que não muda status HTTP).
 */
async function runHomeAnchorsProbe(
  baseUrl: string,
  anchors: readonly string[],
): Promise<ProbeResult & { missing: string[] }> {
  const html = await fetchHtml(`${baseUrl}/`)
  if (html === null) {
    return {
      name: 'home-anchors',
      total: 1,
      expected: 0,
      unexpected: 0,
      errors: 1,
      successRate: 0,
      statuses: { error: 1 },
      missing: [...anchors],
    }
  }
  const missing = findMissingAnchors(html, anchors)
  const ok = missing.length === 0
  return {
    name: 'home-anchors',
    total: 1,
    expected: ok ? 1 : 0,
    unexpected: ok ? 0 : 1,
    errors: 0,
    successRate: ok ? 100 : 0,
    statuses: ok ? { ok: 1 } : { missing: 1 },
    missing,
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

/**
 * Probe Sprint 3.2 Tarefa 4 — uniqueness binária de OGs. Descobre 2
 * entidades amostrais (parlamentar do HTML de /parlamentares + votação
 * do RSS global) e fetch-hash 8 endpoints OG. Hash duplicado entre eles
 * indica que uma rota está caindo no fallback global (regressão pré-3.2).
 *
 * Falha rígida se houver duplicata OU se ≥1 fetch falhar.
 */
async function runOgHashUniquenessProbe(
  baseUrl: string,
): Promise<
  ProbeResult & { failures: Array<{ label: string; reason: string }> }
> {
  // Descobre IDs amostrais — extrai 1 UUID v7 do HTML/RSS já em produção.
  const parlamentaresHtml = await fetchHtml(`${baseUrl}/parlamentares`)
  const parlamentarId =
    parlamentaresHtml?.match(/href="\/parlamentares\/([0-9a-f-]{36})"/i)?.[1] ??
    null
  const votacoesXml = await fetchHtml(`${baseUrl}/feed/votacoes`)
  const votacaoId =
    votacoesXml?.match(/\/votacoes\/([0-9a-f-]{36})/i)?.[1] ?? null

  type Target = { label: string; url: string }
  const targets: Target[] = OG_LISTING_PATHS.map((p) => ({
    label: p,
    url: `${baseUrl}${p}`,
  }))
  if (parlamentarId) {
    targets.push({
      label: `/parlamentares/${parlamentarId}/opengraph-image`,
      url: `${baseUrl}/parlamentares/${parlamentarId}/opengraph-image`,
    })
  }
  if (votacaoId) {
    targets.push({
      label: `/votacoes/${votacaoId}/opengraph-image`,
      url: `${baseUrl}/votacoes/${votacaoId}/opengraph-image`,
    })
  }

  const hashes = await Promise.all(targets.map((t) => fetchPngHash(t.url)))
  const failures: Array<{ label: string; reason: string }> = []
  const validHashes: string[] = []
  for (let i = 0; i < targets.length; i++) {
    const h = hashes[i]
    if (h === null) {
      failures.push({ label: targets[i].label, reason: 'fetch falhou' })
    } else {
      validHashes.push(h)
    }
  }
  if (!parlamentarId) {
    failures.push({
      label: 'discovery',
      reason: 'não extraiu parlamentarId do HTML de /parlamentares',
    })
  }
  if (!votacaoId) {
    failures.push({
      label: 'discovery',
      reason: 'não extraiu votacaoId do RSS /feed/votacoes',
    })
  }

  for (const dupe of findDuplicateHashes(validHashes)) {
    const dupedLabels = targets
      .filter((_, i) => hashes[i] === dupe)
      .map((t) => t.label)
      .join(' = ')
    failures.push({
      label: dupedLabels,
      reason: `hash binário duplicado (${dupe.slice(0, 12)}…) — provável fallback OG global vazando`,
    })
  }

  const total = targets.length
  const expected = total - failures.length
  const ok = failures.length === 0
  return {
    name: 'og-hash-uniqueness',
    total,
    expected: Math.max(0, expected),
    unexpected: ok ? 0 : 1,
    errors: 0,
    successRate: ok ? 100 : 0,
    statuses: ok ? { unique: total } : { duplicate_or_fail: failures.length },
    failures,
  }
}

/** Probe Sprint 3.2 Tarefa 4 — validação de estrutura RSS 2.0 em N feeds amostrais. */
async function runRssXmlValidProbe(
  baseUrl: string,
  paths: readonly string[],
): Promise<
  ProbeResult & { failures: Array<{ path: string; reason: string }> }
> {
  const failures: Array<{ path: string; reason: string }> = []
  let expected = 0
  let errors = 0

  for (const path of paths) {
    const result = await fetchTextWithType(`${baseUrl}${path}`)
    if (!result) {
      errors++
      failures.push({ path, reason: 'fetch falhou ou status != 200' })
      continue
    }
    const validation = validateRssXml(result.body, result.contentType)
    if (validation.ok) {
      expected++
    } else {
      failures.push({ path, reason: validation.reason })
    }
  }

  const total = paths.length
  const unexpected = total - expected - errors
  const successRate = total === 0 ? 0 : (expected / total) * 100
  return {
    name: 'rss-xml-valid',
    total,
    expected,
    unexpected,
    errors,
    successRate: Math.round(successRate * 100) / 100,
    statuses: {
      ok: expected,
      ...(unexpected > 0 ? { invalid: unexpected } : {}),
      ...(errors > 0 ? { error: errors } : {}),
    },
    failures,
  }
}

/** Probe Sprint 3.2 Tarefa 4 — discovery `<link rel=alternate type=application/rss+xml>`. */
async function runRssDiscoveryProbe(
  baseUrl: string,
  paths: readonly string[],
): Promise<ProbeResult & { failures: string[] }> {
  const failures: string[] = []
  let expected = 0
  let errors = 0

  for (const path of paths) {
    const html = await fetchHtml(`${baseUrl}${path}`)
    if (html === null) {
      errors++
      failures.push(`${path} (fetch falhou)`)
      continue
    }
    if (hasRssDiscovery(html)) expected++
    else failures.push(path)
  }

  const total = paths.length
  const unexpected = total - expected - errors
  const successRate = total === 0 ? 0 : (expected / total) * 100
  return {
    name: 'rss-discovery',
    total,
    expected,
    unexpected,
    errors,
    successRate: Math.round(successRate * 100) / 100,
    statuses: {
      ok: expected,
      ...(unexpected > 0 ? { missing: unexpected } : {}),
      ...(errors > 0 ? { error: errors } : {}),
    },
    failures,
  }
}

/** Probe Sprint 3.2 Tarefa 4 — âncoras textuais em cada sub-página de /docs. */
async function runDocsAnchorsProbe(
  baseUrl: string,
  anchorsByPath: Record<string, readonly string[]>,
): Promise<
  ProbeResult & {
    failures: Array<{ path: string; missing: string[] }>
  }
> {
  const failures: Array<{ path: string; missing: string[] }> = []
  let expected = 0
  let errors = 0

  for (const [path, anchors] of Object.entries(anchorsByPath)) {
    const html = await fetchHtml(`${baseUrl}${path}`)
    if (html === null) {
      errors++
      failures.push({ path, missing: [...anchors] })
      continue
    }
    const missing = findMissingAnchors(html, anchors)
    if (missing.length === 0) expected++
    else failures.push({ path, missing })
  }

  const total = Object.keys(anchorsByPath).length
  const unexpected = total - expected - errors
  const successRate = total === 0 ? 0 : (expected / total) * 100
  return {
    name: 'docs-anchors',
    total,
    expected,
    unexpected,
    errors,
    successRate: Math.round(successRate * 100) / 100,
    statuses: {
      ok: expected,
      ...(unexpected > 0 ? { missing_anchors: unexpected } : {}),
      ...(errors > 0 ? { error: errors } : {}),
    },
    failures,
  }
}

/**
 * Probe Sprint 4.0 PR 7 — rotas internas em /dev/* (ex.: /dev/design) NÃO
 * podem ser indexáveis. Valida defense in depth:
 *
 * 1. Header HTTP `X-Robots-Tag: noindex` (next.config.ts `headers()`)
 * 2. Meta tag `<meta name="robots" content="noindex">` (layout
 *    src/app/dev/layout.tsx via Next metadata)
 *
 * Falha rígida — qualquer falha sinaliza regressão de SEO crítica
 * (rota interna sendo indexada por Googlebot etc.).
 */
async function runDevRoutesNoindexProbe(
  baseUrl: string,
  paths: readonly string[],
): Promise<
  ProbeResult & { failures: Array<{ path: string; reason: string }> }
> {
  const failures: Array<{ path: string; reason: string }> = []
  let expected = 0
  let errors = 0

  for (const path of paths) {
    const result = await fetchHtmlWithHeaders(`${baseUrl}${path}`)
    if (result === null) {
      errors++
      failures.push({ path, reason: 'fetch falhou (status != 200)' })
      continue
    }
    const check = validateDevRouteNoindex(
      result.headers.get('x-robots-tag'),
      result.html,
    )
    if (check.ok) expected++
    else failures.push({ path, reason: check.reason })
  }

  const total = paths.length
  const unexpected = total - expected - errors
  const successRate = total === 0 ? 0 : (expected / total) * 100
  return {
    name: 'dev-routes-noindex',
    total,
    expected,
    unexpected,
    errors,
    successRate: Math.round(successRate * 100) / 100,
    statuses: {
      ok: expected,
      ...(unexpected > 0 ? { missing_noindex: unexpected } : {}),
      ...(errors > 0 ? { error: errors } : {}),
    },
    failures,
  }
}

const DEV_NOINDEX_PATHS = ['/dev/design'] as const

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
      // status-HTTP + og-canonical + home-anchors + 4 do Sprint 3.2 Tarefa 4
      // (og-hash-uniqueness, rss-xml-valid, rss-discovery, docs-anchors) +
      // 1 do Sprint 4.0 PR 7 (dev-routes-noindex).
      probes: PROBES.length + 7,
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

  const anchorsResult = await runHomeAnchorsProbe(baseUrl, HOME_CARDS_ANCHORS)
  console.log(JSON.stringify({ event: 'smoke_probe_result', ...anchorsResult }))
  totalRequests += anchorsResult.total
  totalExpected += anchorsResult.expected
  // Falha rígida: cards na home são entrada cívica primária. Removê-los
  // silenciosamente do JSX é regressão crítica de produto.
  const anchorsFailed = anchorsResult.missing.length > 0

  // Sprint 3.2 Tarefa 4 — quatro probes adicionais para regressões que
  // status HTTP não pega (fallback OG vazando, RSS deformado, conteúdo
  // pedagógico removido, discovery ausente).
  const ogHashResult = await runOgHashUniquenessProbe(baseUrl)
  console.log(JSON.stringify({ event: 'smoke_probe_result', ...ogHashResult }))
  totalRequests += ogHashResult.total
  totalExpected += ogHashResult.expected
  const ogHashFailed = ogHashResult.failures.length > 0

  const rssValidResult = await runRssXmlValidProbe(baseUrl, RSS_VALID_PATHS)
  console.log(
    JSON.stringify({ event: 'smoke_probe_result', ...rssValidResult }),
  )
  totalRequests += rssValidResult.total
  totalExpected += rssValidResult.expected
  const rssValidFailed = rssValidResult.failures.length > 0

  const rssDiscoveryResult = await runRssDiscoveryProbe(
    baseUrl,
    RSS_DISCOVERY_PATHS,
  )
  console.log(
    JSON.stringify({ event: 'smoke_probe_result', ...rssDiscoveryResult }),
  )
  totalRequests += rssDiscoveryResult.total
  totalExpected += rssDiscoveryResult.expected
  const rssDiscoveryFailed = rssDiscoveryResult.failures.length > 0

  const docsAnchorsResult = await runDocsAnchorsProbe(
    baseUrl,
    DOCS_ANCHORS_BY_PATH,
  )
  console.log(
    JSON.stringify({ event: 'smoke_probe_result', ...docsAnchorsResult }),
  )
  totalRequests += docsAnchorsResult.total
  totalExpected += docsAnchorsResult.expected
  const docsAnchorsFailed = docsAnchorsResult.failures.length > 0

  // Sprint 4.0 PR 7 — rotas /dev/* não-indexáveis. Falha rígida: regressão
  // de SEO crítica se /dev/design começar a ser indexado.
  const devNoindexResult = await runDevRoutesNoindexProbe(
    baseUrl,
    DEV_NOINDEX_PATHS,
  )
  console.log(
    JSON.stringify({ event: 'smoke_probe_result', ...devNoindexResult }),
  )
  totalRequests += devNoindexResult.total
  totalExpected += devNoindexResult.expected
  const devNoindexFailed = devNoindexResult.failures.length > 0

  const overallSuccessRate =
    totalRequests === 0 ? 0 : (totalExpected / totalRequests) * 100
  const passed =
    overallSuccessRate >= SUCCESS_THRESHOLD_PERCENT &&
    !ogFailed &&
    !anchorsFailed &&
    !ogHashFailed &&
    !rssValidFailed &&
    !rssDiscoveryFailed &&
    !docsAnchorsFailed &&
    !devNoindexFailed

  console.log(
    JSON.stringify({
      event: passed ? 'smoke_passed' : 'smoke_failed',
      totalRequests,
      totalExpected,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      threshold: SUCCESS_THRESHOLD_PERCENT,
      ogCanonicalFailed: ogFailed,
      homeAnchorsFailed: anchorsFailed,
      ogHashUniquenessFailed: ogHashFailed,
      rssXmlValidFailed: rssValidFailed,
      rssDiscoveryFailed,
      docsAnchorsFailed,
      devNoindexFailed,
      ...(ogFailed ? { ogFailures: ogResult.failures } : {}),
      ...(anchorsFailed ? { missingAnchors: anchorsResult.missing } : {}),
      ...(ogHashFailed ? { ogHashFailures: ogHashResult.failures } : {}),
      ...(rssValidFailed ? { rssValidFailures: rssValidResult.failures } : {}),
      ...(rssDiscoveryFailed
        ? { rssDiscoveryMissing: rssDiscoveryResult.failures }
        : {}),
      ...(docsAnchorsFailed
        ? { docsAnchorsFailures: docsAnchorsResult.failures }
        : {}),
      ...(devNoindexFailed
        ? { devNoindexFailures: devNoindexResult.failures }
        : {}),
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
