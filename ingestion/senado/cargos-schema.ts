import { z } from 'zod'

// Schema de GET /senador/{codigo}/cargos.json (G15, Sprint 27).
//
// ⚠️  XML-convertido-em-JSON: elemento repetível vem como objeto único quando
//     há um só, array quando há vários. `oneOrMany` normaliza para array.
//
// Shape verificado empiricamente em 2026-07-14 (#727 item 3, senador 470):
// o envelope real é `CargoParlamentar` (não `CargosExercidosParlamentar`,
// como o schema original assumia) e o item traz a comissão em
// `IdentificacaoComissao` + o cargo em `DescricaoCargo` — o parse falhava
// para 81/81 senadores ("expected object, received undefined") e a fonte
// nunca populou prod. Não há `IndicadorAtividade`; vigência = DataFim nula.

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

export const senadoCargoItemSchema = z
  .object({
    IdentificacaoComissao: z
      .object({
        // Sigla do colegiado. Ex.: "CCJ", "CRA", "GPGUIANA".
        SiglaComissao: z.string().min(1),
        NomeComissao: z.string().nullable().optional(),
        // "SF" | "CN" (comissões mistas/grupos do Congresso).
        SiglaCasaComissao: z.string().nullable().optional(),
        CodigoComissao: z
          .union([z.string(), z.number()])
          .transform(String)
          .optional(),
      })
      .passthrough(),
    // Ex.: "PRESIDENTE", "VICE-PRESIDENTE", "MEMBRO", "TITULAR", "SUPLENTE".
    DescricaoCargo: z.string().min(1),
    CodigoCargo: z.union([z.string(), z.number()]).transform(String).optional(),
    DataInicio: z.string().nullable().optional(),
    DataFim: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoCargoItem = z.infer<typeof senadoCargoItemSchema>

export const senadoCargosEnvelopeSchema = z
  .object({
    CargoParlamentar: z
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
