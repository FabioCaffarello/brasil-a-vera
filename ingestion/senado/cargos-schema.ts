import { z } from 'zod'

// Schema de GET /senador/{codigo}/cargos.json (G15, Sprint 27).
//
// ⚠️  XML-convertido-em-JSON: elemento repetível vem como objeto único quando
//     há um só, array quando há vários. `oneOrMany` normaliza para array.
//
// Probe empírico necessário antes do merge (Princípio 13):
//   curl https://legis.senado.leg.br/dadosabertos/senador/{id}/cargos.json
//   e copiar amostra no PR.

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

export const senadoCargoItemSchema = z
  .object({
    NomeCargo: z.string().min(1),
    // Sigla do colegiado (comissão/subcomissão). Ex.: "CCJ", "CRA".
    SiglaColegiado: z.string().min(1),
    NomeColegiado: z.string().nullable().optional(),
    DataInicio: z.string().nullable().optional(),
    DataFim: z.string().nullable().optional(),
    // "Sim" = vigente, "Não" = encerrado.
    IndicadorAtividade: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoCargoItem = z.infer<typeof senadoCargoItemSchema>

export const senadoCargosEnvelopeSchema = z
  .object({
    CargosExercidosParlamentar: z
      .object({
        Parlamentar: z
          .object({
            Cargos: z
              .object({
                Cargo: oneOrMany(senadoCargoItemSchema).optional(),
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

export type SenadoCargosEnvelope = z.infer<typeof senadoCargosEnvelopeSchema>
