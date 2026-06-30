import { execFileSync } from 'node:child_process'

import { z } from 'zod'

import {
  avgStorageGb,
  type BudgetLevel,
  classifyBudget,
  estimateMonthlyCostUsd,
  monthlyComputeHours,
} from './neon-budget-calc'

const envSchema = z.object({
  NEON_API_KEY: z.string().min(10, 'NEON_API_KEY ausente'),
  NEON_PROJECT_ID: z.string().min(3, 'NEON_PROJECT_ID ausente'),
  DISCORD_BUDGET_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  // BUDGET_DRY_RUN=1 desliga side-effects (Discord POST, gh issue comment/create).
  // Útil para validar local sem espalhar comentário em prod.
  BUDGET_DRY_RUN: z.string().optional(),
})

// Schema da resposta da Neon API /projects/{id}. Campos não usados aqui
// ficam fora — o objeto raw tem dezenas. Strict: false para tolerar
// adições futuras sem quebrar.
const neonProjectSchema = z
  .object({
    project: z.object({
      created_at: z.string(),
      compute_time_seconds: z.number(),
      data_storage_bytes_hour: z.number(),
    }),
  })
  .passthrough()

const NEON_API_BASE = 'https://console.neon.tech/api/v2'
const TRACKER_ISSUE = 39 // revisão trimestral recorrente, tied to ADR-017
const REPO_LABEL_CRITICAL = 'ops'

type Metrics = {
  daysSinceCreated: number
  computeHoursMonthly: number
  avgStorageGb: number
  estimatedMonthlyCostUsd: number
}

async function fetchNeonProject(
  apiKey: string,
  projectId: string,
): Promise<z.infer<typeof neonProjectSchema>> {
  const url = `${NEON_API_BASE}/projects/${projectId}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(
      `Neon API ${url} retornou ${res.status}: ${await res.text()}`,
    )
  }
  const json: unknown = await res.json()
  return neonProjectSchema.parse(json)
}

function computeMetrics(
  project: z.infer<typeof neonProjectSchema>['project'],
): Metrics {
  const createdAt = new Date(project.created_at)
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysSinceCreated = Math.max(
    1,
    Math.floor((now.getTime() - createdAt.getTime()) / msPerDay),
  )
  const computeHoursMonthly = monthlyComputeHours(
    project.compute_time_seconds,
    daysSinceCreated,
  )
  const storageGb = avgStorageGb(
    project.data_storage_bytes_hour,
    daysSinceCreated,
  )
  const estimatedMonthlyCostUsd = estimateMonthlyCostUsd({
    computeHoursMonthly,
    avgStorageGb: storageGb,
  })
  return {
    daysSinceCreated,
    computeHoursMonthly,
    avgStorageGb: storageGb,
    estimatedMonthlyCostUsd,
  }
}

async function postDiscord(
  webhookUrl: string,
  level: BudgetLevel,
  metrics: Metrics,
): Promise<void> {
  const colorByLevel: Record<BudgetLevel, number> = {
    normal: 5763719,
    info: 3447003,
    alert: 15844367,
    critical: 15158332,
  }
  const payload = {
    content: `Budget Neon: nível ${level.toUpperCase()} — estimativa US$${metrics.estimatedMonthlyCostUsd}`,
    embeds: [
      {
        title: `US$ ${metrics.estimatedMonthlyCostUsd} estimado/mês`,
        description: [
          `Compute: ${metrics.computeHoursMonthly.toFixed(2)} h/mês`,
          `Storage: ${metrics.avgStorageGb.toFixed(3)} GiB médio`,
          `Run-rate desde: ${metrics.daysSinceCreated} dias`,
          'Zonas em ADR-017 (verde $0-$5 / amarela $5-$15 / vermelha >$15)',
        ].join('\n'),
        color: colorByLevel[level],
      },
    ],
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error(
        JSON.stringify({
          event: 'budget_discord_failed',
          status: res.status,
        }),
      )
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'budget_discord_failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    )
  }
}

function ghIssueComment(issueNumber: number, body: string): void {
  try {
    execFileSync(
      'gh',
      ['issue', 'comment', String(issueNumber), '--body', body],
      {
        stdio: 'inherit',
      },
    )
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'budget_gh_comment_failed',
        issue: issueNumber,
        message: err instanceof Error ? err.message : String(err),
      }),
    )
  }
}

function findOpenCriticalIssueNumber(): number | null {
  try {
    const stdout = execFileSync(
      'gh',
      [
        'issue',
        'list',
        '--label',
        REPO_LABEL_CRITICAL,
        '--state',
        'open',
        '--limit',
        '100',
        '--json',
        'number,title',
      ],
      { encoding: 'utf-8' },
    )
    const items = z
      .array(z.object({ number: z.number(), title: z.string() }))
      .parse(JSON.parse(stdout))
    const match = items.find((i) => i.title.includes('budget critical'))
    return match ? match.number : null
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'budget_gh_search_failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    )
    return null
  }
}

function createCriticalIssue(body: string, title: string): void {
  try {
    execFileSync(
      'gh',
      [
        'issue',
        'create',
        '--title',
        title,
        '--label',
        `${REPO_LABEL_CRITICAL},ops,wave-2.0`,
        '--body',
        body,
      ],
      { stdio: 'inherit' },
    )
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'budget_gh_create_failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    )
  }
}

function dispatchNotifications(
  metrics: Metrics,
  level: BudgetLevel,
  webhookUrl: string | undefined,
  dryRun: boolean,
): void {
  const timestamp = new Date().toISOString()
  const runUrl = process.env.GITHUB_SERVER_URL
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : '(local run)'

  if (level === 'normal') {
    return
  }

  if (dryRun) {
    console.log(
      JSON.stringify({
        event: 'budget_dry_run_skip_side_effects',
        wouldDispatchLevel: level,
      }),
    )
    return
  }

  if (webhookUrl) {
    void postDiscord(webhookUrl, level, metrics)
  } else {
    console.error('DISCORD_BUDGET_WEBHOOK_URL not set; skipping Discord notify')
  }

  if (level === 'alert') {
    const body = [
      `Budget Neon atingiu zona AMARELA (estimativa US$${metrics.estimatedMonthlyCostUsd}) em ${timestamp}.`,
      '',
      'Threshold disparado: $7 — sinal antes do limite vermelho ($15).',
      '',
      `- Compute run-rate: ${metrics.computeHoursMonthly.toFixed(2)} h/mês`,
      `- Storage médio: ${metrics.avgStorageGb.toFixed(3)} GiB`,
      `- Workflow run: ${runUrl}`,
      '',
      'Ver ADR-017 para zonas e respostas esperadas. Comentário gerado automaticamente pelo poll diário (issue #40).',
    ].join('\n')
    ghIssueComment(TRACKER_ISSUE, body)
  }

  if (level === 'critical') {
    const title = `budget critical: estimativa US$${metrics.estimatedMonthlyCostUsd} atingiu zona vermelha`
    const body = [
      `Budget Neon atingiu zona VERMELHA (estimativa US$${metrics.estimatedMonthlyCostUsd}) em ${timestamp}.`,
      '',
      'Threshold disparado: $15 — STOP em novas features per ADR-017.',
      '',
      `- Compute run-rate: ${metrics.computeHoursMonthly.toFixed(2)} h/mês`,
      `- Storage médio: ${metrics.avgStorageGb.toFixed(3)} GiB`,
      `- Workflow run: ${runUrl}`,
      '',
      '## Próximos passos',
      '',
      '1. Confirmar valor em https://console.neon.tech',
      '2. Identificar causa da escalada (mais tráfego? query nova ineficiente? data growth?)',
      '3. Reagir conforme ADR-017 (revisitar ADR-016 archive, ADR-018 cache, ou estratégias mais agressivas)',
      '4. Fechar esta issue quando estabilizado em zona amarela/verde',
      '',
      'Re-incidências enquanto esta issue estiver aberta viram comentários.',
    ].join('\n')

    const existing = findOpenCriticalIssueNumber()
    if (existing) {
      ghIssueComment(existing, body)
    } else {
      createCriticalIssue(body, title)
    }
  }
}

async function main(): Promise<void> {
  const envResult = envSchema.safeParse(process.env)
  if (!envResult.success) {
    const reason = envResult.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    console.error(JSON.stringify({ event: 'budget_env_invalid', reason }))
    process.exit(2)
  }
  const env = envResult.data

  console.log(JSON.stringify({ event: 'budget_start' }))

  const project = await fetchNeonProject(env.NEON_API_KEY, env.NEON_PROJECT_ID)
  const metrics = computeMetrics(project.project)
  const classification = classifyBudget(metrics.estimatedMonthlyCostUsd)

  console.log(
    JSON.stringify({
      event: 'budget_result',
      level: classification.level,
      thresholdUsd: classification.thresholdUsd,
      estimatedMonthlyCostUsd: metrics.estimatedMonthlyCostUsd,
      computeHoursMonthly: Number(metrics.computeHoursMonthly.toFixed(2)),
      avgStorageGb: Number(metrics.avgStorageGb.toFixed(4)),
      daysSinceCreated: metrics.daysSinceCreated,
    }),
  )

  const webhookUrl =
    env.DISCORD_BUDGET_WEBHOOK_URL && env.DISCORD_BUDGET_WEBHOOK_URL !== ''
      ? env.DISCORD_BUDGET_WEBHOOK_URL
      : undefined
  const dryRun = env.BUDGET_DRY_RUN === '1' || env.BUDGET_DRY_RUN === 'true'

  dispatchNotifications(metrics, classification.level, webhookUrl, dryRun)
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'budget_crashed',
      message: err instanceof Error ? err.message : String(err),
    }),
  )
  process.exit(2)
})
