import { z } from 'zod'

// Schema de GET /senador/{id}/licencas no Senado (Sprint 13.0, ADR-058).
//
// Estrutura real validada empiricamente (princípio 13, 2026-06-24):
//   { "LicencaParlamentar": { "Parlamentar": { "Licencas": { "Licenca": [...] } } } }
//
// Campos do item de licença:
//   Codigo, DataInicio, DataFim (nullable), SiglaTipoAfastamento,
//   DescricaoTipoAfastamento, DataInicioPrevista, DataFimPrevista
//
// ⚠️ XML-convertido-em-JSON: elemento repetível vem como objeto único quando
//    há um só, array quando há vários. `oneOrMany` normaliza para array.

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

// Datas chegam em "YYYY-MM-DD" (confirmado empiricamente). Mantém conversão
// DD/MM/YYYY como fallback defensivo — a API Senado mistura formatos.
function parseSenadoDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return raw.slice(0, 10)
  return null
}

const licencaSchema = z
  .object({
    SiglaTipoAfastamento: z.string().min(1),
    DescricaoTipoAfastamento: z.string().nullable().optional(),
    DataInicio: z.string(),
    DataFim: z.string().nullable().optional(),
  })
  .passthrough()
  .transform((l) => ({
    motivoSigla: l.SiglaTipoAfastamento,
    motivoDescricao: l.DescricaoTipoAfastamento?.trim() || null,
    dataInicio: parseSenadoDate(l.DataInicio),
    dataFim: l.DataFim ? parseSenadoDate(l.DataFim) : null,
  }))

export const licencaParlamentarEnvelopeSchema = z
  .object({
    LicencaParlamentar: z
      .object({
        Parlamentar: z
          .object({
            Licencas: z
              .object({
                Licenca: oneOrMany(licencaSchema).optional(),
              })
              .nullable()
              .optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type LicencaParlamentarEnvelope = z.infer<
  typeof licencaParlamentarEnvelopeSchema
>
