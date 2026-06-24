import { z } from 'zod'

// GET /deputados/{id}/mandatosExternos
// Retorna lista de mandatos externos (carreira pré-Câmara), verificada via TSE.

export const mandatoExternoItemSchema = z
  .object({
    cargo: z.string(),
    siglaUf: z.string().nullable().optional(),
    municipio: z.string().nullable().optional(),
    anoInicio: z.string().nullable().optional(),
    anoFim: z.string().nullable().optional(),
    siglaPartidoEleicao: z.string().nullable().optional(),
    uriPartidoEleicao: z.string().nullable().optional(),
  })
  .passthrough()

export const mandatosExternosResponseSchema = z
  .object({
    dados: z.array(mandatoExternoItemSchema),
  })
  .passthrough()

export type MandatoExternoItem = z.infer<typeof mandatoExternoItemSchema>
export type MandatosExternosResponse = z.infer<
  typeof mandatosExternosResponseSchema
>
