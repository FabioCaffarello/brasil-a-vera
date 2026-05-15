export type ProbeResult = {
  name: string
  total: number
  expected: number
  unexpected: number
  errors: number
  successRate: number
  statuses: Record<string, number>
}

/**
 * Extrai o `content` da meta tag `og:image` de um HTML. Funções puras —
 * testável sem rede.
 *
 * Regex tolerante a ordem de atributos e tipo de aspas. Retorna o primeiro
 * match (Next.js sempre emite apenas 1 `og:image` por rota).
 */
export function extractOgImage(html: string): string | null {
  // Tenta ordem `property` antes de `content` e vice-versa.
  const patterns = [
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
  ]
  for (const re of patterns) {
    const m = re.exec(html)
    if (m) return m[1]
  }
  return null
}

/**
 * Valida que o `og:image` é canônico para o `baseUrl` esperado. Falha se:
 * - tag ausente
 * - contém substring `localhost` (regressão clássica do Sprint 3.0 Tarefa 1.1)
 * - não começa com `baseUrl` (apontando para outro domínio)
 */
export function validateOgImageCanonical(
  html: string,
  baseUrl: string,
): { ok: true; ogImage: string } | { ok: false; reason: string } {
  const ogImage = extractOgImage(html)
  if (!ogImage) return { ok: false, reason: 'og:image meta tag ausente' }
  if (ogImage.includes('localhost')) {
    return { ok: false, reason: `og:image contém "localhost": ${ogImage}` }
  }
  const trimmedBase = baseUrl.replace(/\/$/, '')
  if (!ogImage.startsWith(trimmedBase)) {
    return {
      ok: false,
      reason: `og:image não começa com baseUrl esperado (${trimmedBase}): ${ogImage}`,
    }
  }
  return { ok: true, ogImage }
}

/**
 * Verifica presença de todas as strings âncora no HTML. Usado pelo probe
 * de cards-na-home no smoke — guarda contra regressão silenciosa de
 * componentes removidos do JSX sem que o status HTTP mude.
 *
 * Retorna lista das âncoras AUSENTES (vazia = todas presentes).
 */
export function findMissingAnchors(
  html: string,
  anchors: readonly string[],
): string[] {
  return anchors.filter((a) => !html.includes(a))
}

/**
 * Confirma que cada hash binário aparece no máximo uma vez. Usado pelo probe
 * de OG uniqueness — duplicidade significa que uma rota está caindo no
 * fallback global em vez de renderizar seu próprio OG (regressão silenciosa
 * pré-Sprint 3.2: 5 listagens compartilhavam o fallback do global).
 *
 * Retorna lista das duplicatas (hashes que aparecem ≥2 vezes). Vazio = OK.
 */
export function findDuplicateHashes(hashes: readonly string[]): string[] {
  const counts = new Map<string, number>()
  for (const h of hashes) counts.set(h, (counts.get(h) ?? 0) + 1)
  const dupes: string[] = []
  for (const [h, n] of counts) if (n > 1) dupes.push(h)
  return dupes
}

/**
 * Validação textual de RSS 2.0 — sem parser XML completo (evita dep nova).
 * Checa elementos obrigatórios do canal + presença de ≥1 item, conformidade
 * com `atom:link rel="self"` (recomendado pelo RSS Best Practices Profile)
 * e content-type esperado.
 *
 * Não substitui validador estrito (W3C Feed Validator) mas detecta regressão
 * que mude o shape do feed sem mudar o status HTTP.
 */
export function validateRssXml(
  body: string,
  contentType: string,
): { ok: true } | { ok: false; reason: string } {
  if (!contentType.toLowerCase().startsWith('application/rss+xml')) {
    return {
      ok: false,
      reason: `content-type não é application/rss+xml: ${contentType}`,
    }
  }
  if (!body.includes('<?xml')) {
    return { ok: false, reason: 'sem declaração `<?xml`' }
  }
  if (!body.includes('<rss version="2.0"')) {
    return { ok: false, reason: 'sem `<rss version="2.0"`' }
  }
  if (!body.includes('<channel>')) {
    return { ok: false, reason: 'sem `<channel>`' }
  }
  if (!body.includes('</channel>')) {
    return { ok: false, reason: 'sem `</channel>` (XML truncado?)' }
  }
  if (!/atom:link[^>]*rel="self"/.test(body)) {
    return { ok: false, reason: 'sem `<atom:link rel="self">`' }
  }
  if (!body.includes('<item>')) {
    return { ok: false, reason: 'feed sem items' }
  }
  return { ok: true }
}

/**
 * Detecta presença do `<link rel="alternate" type="application/rss+xml">` —
 * mecanismo de descoberta de feeds usado por extensões e leitores (NetNewsWire,
 * Feedly Subscribe). Aceita ordem variável de atributos.
 *
 * Sprint 3.2 Tarefa 4 — guarda contra remoção silenciosa da discovery.
 */
export function hasRssDiscovery(html: string): boolean {
  const patternA = /<link[^>]+rel="alternate"[^>]+type="application\/rss\+xml"/i
  const patternB = /<link[^>]+type="application\/rss\+xml"[^>]+rel="alternate"/i
  return patternA.test(html) || patternB.test(html)
}

/**
 * Validação noindex para rotas internas em /dev/* (introduzidas pela
 * Sprint 4.0 PR 7 — /dev/design). Cobre defense in depth:
 *
 * 1. Header HTTP `X-Robots-Tag` com `noindex` — para crawlers que só
 *    leem headers (e.g. Googlebot ao seguir links de outros sites).
 * 2. Meta tag `<meta name="robots" content="noindex...">` no HTML — para
 *    crawlers que respeitam meta tags.
 *
 * Ambas devem estar presentes. Falha se qualquer uma estiver ausente.
 */
export function validateDevRouteNoindex(
  xRobotsTagHeader: string | null,
  html: string,
): { ok: true } | { ok: false; reason: string } {
  const headerNoindex = (xRobotsTagHeader ?? '')
    .toLowerCase()
    .includes('noindex')
  if (!headerNoindex) {
    return {
      ok: false,
      reason: `X-Robots-Tag header ausente ou sem "noindex": ${
        xRobotsTagHeader ?? '(null)'
      }`,
    }
  }
  const metaPattern =
    /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*["']/i
  const metaPatternReverse =
    /<meta\s+content=["'][^"']*noindex[^"']*["']\s+name=["']robots["']/i
  if (!metaPattern.test(html) && !metaPatternReverse.test(html)) {
    return {
      ok: false,
      reason: '<meta name="robots" content="noindex..."> ausente do HTML',
    }
  }
  return { ok: true }
}

export function aggregateProbeResults(
  name: string,
  statuses: number[],
  expectedStatuses: readonly number[],
): ProbeResult {
  let expected = 0
  let unexpected = 0
  let errors = 0
  const counts: Record<string, number> = {}
  for (const s of statuses) {
    const key = s === -1 ? 'error' : String(s)
    counts[key] = (counts[key] ?? 0) + 1
    if (s === -1) {
      errors++
    } else if (expectedStatuses.includes(s)) {
      expected++
    } else {
      unexpected++
    }
  }
  const total = statuses.length
  const successRate = total === 0 ? 0 : (expected / total) * 100
  return {
    name,
    total,
    expected,
    unexpected,
    errors,
    successRate: Math.round(successRate * 100) / 100,
    statuses: counts,
  }
}
