import { z } from 'zod'

// Validação centralizada das variáveis de ambiente esperadas pelos scripts
// de ingestão. Falha rápida com mensagem clara se o workflow_dispatch passar
// formato inválido (DATA_INICIO="2025-13-45") — antes era erro críptico do
// Postgres ou da API externa.

const ymdRegex = /^\d{4}-\d{2}-\d{2}$/
const ymd = z
  .string()
  .regex(ymdRegex, 'esperado YYYY-MM-DD')
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const ano = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : v
}, z.number().int().min(2000).max(2100).optional())

const ingestEnvSchema = z.object({
  DATA_INICIO: ymd,
  DATA_FIM: ymd,
  ANO: ano,
})

export type IngestEnv = z.infer<typeof ingestEnvSchema>

/**
 * Lê e valida `DATA_INICIO`, `DATA_FIM` e `ANO` de `process.env`. Aborta o
 * processo com exit code 2 se algum valor estiver inválido.
 */
export function readIngestEnv(): IngestEnv {
  const result = ingestEnvSchema.safeParse(process.env)
  if (!result.success) {
    const reason = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    console.error(
      JSON.stringify({
        event: 'ingest_env_invalid',
        reason,
      }),
    )
    process.exit(2)
  }
  return result.data
}
