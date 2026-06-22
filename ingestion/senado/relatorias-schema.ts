import { z } from 'zod'

// Schema de GET /senador/{id}/relatorias (ADR-044, emenda 2026-06-21).
//
// ⚠️ Endpoint LEGADO: o Metadados anuncia descontinuação (DataDesativacaoCompleta
// 2026-02-01), mas continua servindo dados frescos. É a ÚNICA fonte de
// relatorias do Senado — a API moderna /processo não expõe relator (probe
// 2026-06-21). A ingestão é fail-soft: se o endpoint cair, loga e segue.
//
// XML-convertido-em-JSON: elemento repetível vem como objeto único quando há um
// só, array quando há vários. `oneOrMany` normaliza para array.
const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

const materiaSchema = z
  .object({
    Codigo: z.union([z.string(), z.number()]).transform(String),
  })
  .passthrough()

const relatoriaSchema = z
  .object({
    DescricaoTipoRelator: z.string().nullable().optional(),
    DataDesignacao: z.string().nullable().optional(),
    Materia: materiaSchema,
  })
  .passthrough()

export const senadoRelatoriasEnvelopeSchema = z
  .object({
    MateriasRelatoriaParlamentar: z
      .object({
        Parlamentar: z
          .object({
            Relatorias: z
              .object({
                Relatoria: oneOrMany(relatoriaSchema).optional(),
              })
              .nullable()
              .optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough()

export type SenadoRelatoriasEnvelope = z.infer<
  typeof senadoRelatoriasEnvelopeSchema
>
