import { z } from 'zod'

// Schema da resposta de GET /votacoes/{id}/votos.
// O `tipoVoto` vem como string PT-BR — mapeado para o enum interno em
// `votos-mapper.ts`.

export const camaraVotoNominalSchema = z
  .object({
    tipoVoto: z.string().min(1),
    dataRegistroVoto: z.string().nullable().optional(),
    deputado_: z
      .object({
        id: z.number().int(),
        nome: z.string().min(1),
        siglaPartido: z.string().nullable().optional(),
        siglaUf: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type CamaraVotoNominal = z.infer<typeof camaraVotoNominalSchema>
