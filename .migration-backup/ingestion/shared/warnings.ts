// Detecção de truncamento silencioso em chamadas paginadas a APIs públicas.
//
// Quando um endpoint aceita `limit` fixo e retorna exatamente esse número de
// rows (ou mais, defensivamente), é forte indício de que a API truncou — sem
// indicar via header ou status. Esta função emite warn estruturado em
// stderr (ingerido pelos logs do GitHub Actions) e, opcionalmente, posta no
// Discord para alertar o operador em tempo de execução.
//
// Pattern do webhook segue `ingestion/ops/neon-budget.ts` (postDiscord).

export interface AtLimitWarning {
  label: string
  count: number
  limit: number
}

interface StructuredLogEvent extends AtLimitWarning {
  event: 'warn_limit_reached'
  timestamp: string
}

export async function warnIfAtLimit(args: AtLimitWarning): Promise<void> {
  if (args.count < args.limit) return

  const payload: StructuredLogEvent = {
    event: 'warn_limit_reached',
    label: args.label,
    count: args.count,
    limit: args.limit,
    timestamp: new Date().toISOString(),
  }
  console.warn(JSON.stringify(payload))

  const webhookUrl = process.env.DISCORD_INGESTION_WEBHOOK_URL
  if (webhookUrl && webhookUrl !== '') {
    await postWebhook(webhookUrl, payload)
  }
}

async function postWebhook(
  webhookUrl: string,
  event: StructuredLogEvent,
): Promise<void> {
  const payload = {
    content: `Ingestão: \`${event.label}\` atingiu limit (${event.count}/${event.limit})`,
    embeds: [
      {
        title: 'Possível truncamento em chamada paginada',
        description: [
          `Label: \`${event.label}\``,
          `Count: ${event.count}`,
          `Limit: ${event.limit}`,
          `Timestamp: ${event.timestamp}`,
          'Investigar se a API truncou e definir paginação real.',
        ].join('\n'),
        color: 15844367,
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
          event: 'ingestion_warn_discord_failed',
          status: res.status,
        }),
      )
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'ingestion_warn_discord_failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    )
  }
}
