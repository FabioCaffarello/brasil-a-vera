export type ProbeResult = {
  name: string
  total: number
  expected: number
  unexpected: number
  errors: number
  successRate: number
  statuses: Record<string, number>
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
