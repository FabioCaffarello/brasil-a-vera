import { z } from 'zod'

// Schema da resposta de GET /deputados/{id}/historico.
// `dados[]` é a série de eventos do exercício parlamentar; para filiação
// interessam `dataHora` + `siglaPartido` (demais campos ignorados).

export const camaraHistoricoEventoSchema = z
  .object({
    dataHora: z.string().min(1),
    siglaPartido: z.string().nullable().optional(),
  })
  .passthrough()

export const camaraHistoricoRespostaSchema = z
  .object({
    dados: z.array(camaraHistoricoEventoSchema).optional(),
  })
  .passthrough()

export type CamaraHistoricoEvento = z.infer<typeof camaraHistoricoEventoSchema>
