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
