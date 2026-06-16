import { appendFileSync } from 'node:fs'

import { z } from 'zod'

import { cadenceSchema, SOURCES } from '../registry'
import { buildTierMatrices } from './matrix-builder'

// Entry-point chamado pelo job `discover` de cada workflow de ingestão.
// Lê CADENCE, constrói a matrix por tier a partir do registry e escreve
// `tierN=<json>` no $GITHUB_OUTPUT (uma linha por tier). Os jobs `tierN` do
// workflow consomem via `fromJSON(needs.discover.outputs.tierN)`.
//
// Sem GITHUB_OUTPUT (rodada local) só imprime no stdout — não há side-effect
// destrutivo (nada de DB/rede), então não precisa de DRY_RUN guard.

const envSchema = z.object({
  CADENCE: cadenceSchema,
})

function main(): void {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const reason = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    console.error(JSON.stringify({ event: 'print_matrix_env_invalid', reason }))
    process.exit(2)
  }

  const cadence = parsed.data.CADENCE
  const tiers = buildTierMatrices(SOURCES, cadence)
  const lines = tiers.map((entries, i) => `tier${i}=${JSON.stringify(entries)}`)

  console.log(
    JSON.stringify({
      event: 'print_matrix_result',
      cadence,
      tiers: tiers.length,
      counts: tiers.map((t) => t.length),
    }),
  )
  for (const line of lines) {
    console.log(line)
  }

  const outFile = process.env.GITHUB_OUTPUT
  if (outFile) {
    // JSON é single-line (sem indent), então `key=value` direto basta.
    appendFileSync(outFile, `${lines.join('\n')}\n`)
  }
}

main()
