import { z } from 'zod'

// Schema de GET /senador/{id}/licencas no Senado (Sprint 13.0, ADR-058).
//
// ⚠️ XML-convertido-em-JSON: elemento repetível vem como objeto único quando
//    há um só, array quando há vários. `oneOrMany` normaliza para array.
//
// ⚠️ Princípio 13: schema validado contra fixture real antes do merge.
//    Copiar output de `npm run ingest:senado:afastamentos` (stats.sample) no PR.

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

// Data pode vir como "YYYY-MM-DD" ou "DD/MM/YYYY" (Senado mistura formatos).
// Normaliza para "YYYY-MM-DD" para gravar como `date` no Postgres.
function parseSenadoDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  // DD/MM/YYYY
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  // YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return raw.slice(0, 10)
  return null
}

const licencaSchema = z
  .object({
    SiglaMotivoLicenca: z.string().min(1),
    DescricaoMotivoLicenca: z.string().nullable().optional(),
    DataInicio: z.string(),
    DataFim: z.string().nullable().optional(),
  })
  .passthrough()
  .transform((l) => ({
    motivoSigla: l.SiglaMotivoLicenca,
    motivoDescricao: l.DescricaoMotivoLicenca?.trim() || null,
    dataInicio: parseSenadoDate(l.DataInicio),
    dataFim: l.DataFim ? parseSenadoDate(l.DataFim) : null,
  }))

export type AfastamentoMapped = {
  motivoSigla: string
  motivoDescricao: string | null
  dataInicio: string | null
  dataFim: string | null
}

export const senadorLicencasEnvelopeSchema = z
  .object({
    SenadorLicencas: z
      .object({
        Licencas: z
          .object({
            Licenca: oneOrMany(licencaSchema).optional(),
          })
          .nullable()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type SenadorLicencasEnvelope = z.infer<
  typeof senadorLicencasEnvelopeSchema
>
