export type BudgetLevel = 'normal' | 'info' | 'alert' | 'critical'

export type Classification = {
  level: BudgetLevel
  thresholdUsd: number
}

export const BUDGET_THRESHOLDS = {
  info: 3,
  alert: 7,
  critical: 15,
} as const

// Forecast a Launch pay-as-you-go (sem base fee, sem step de tier). Útil
// como sinal contínuo enquanto estamos em free tier — apesar do bill real
// ser $0 até passar do quota free, esse número responde a tendência.
// Documentado em ADR-017 e seção "Monitoramento de budget Neon" do
// DEPLOYMENT.md.
const PRICING_USD = {
  computePerHour: 0.16,
  storagePerGbMonth: 0.35,
} as const

const SECONDS_PER_HOUR = 3600
const HOURS_PER_DAY = 24
const DAYS_PER_MONTH = 30
const BYTES_PER_GIB = 1024 ** 3

export function classifyBudget(estimatedUsd: number): Classification {
  if (estimatedUsd >= BUDGET_THRESHOLDS.critical) {
    return { level: 'critical', thresholdUsd: BUDGET_THRESHOLDS.critical }
  }
  if (estimatedUsd >= BUDGET_THRESHOLDS.alert) {
    return { level: 'alert', thresholdUsd: BUDGET_THRESHOLDS.alert }
  }
  if (estimatedUsd >= BUDGET_THRESHOLDS.info) {
    return { level: 'info', thresholdUsd: BUDGET_THRESHOLDS.info }
  }
  return { level: 'normal', thresholdUsd: 0 }
}

export function monthlyComputeHours(
  computeTimeSecondsLifetime: number,
  daysSinceCreated: number,
): number {
  const days = Math.max(1, daysSinceCreated)
  const dailySeconds = computeTimeSecondsLifetime / days
  return (dailySeconds * DAYS_PER_MONTH) / SECONDS_PER_HOUR
}

export function avgStorageGb(
  dataStorageBytesHourLifetime: number,
  daysSinceCreated: number,
): number {
  const hours = Math.max(1, daysSinceCreated) * HOURS_PER_DAY
  const avgBytes = dataStorageBytesHourLifetime / hours
  return avgBytes / BYTES_PER_GIB
}

export type EstimateInputs = {
  computeHoursMonthly: number
  avgStorageGb: number
}

export function estimateMonthlyCostUsd(inputs: EstimateInputs): number {
  const compute = inputs.computeHoursMonthly * PRICING_USD.computePerHour
  const storage = inputs.avgStorageGb * PRICING_USD.storagePerGbMonth
  return Math.round((compute + storage) * 100) / 100
}
