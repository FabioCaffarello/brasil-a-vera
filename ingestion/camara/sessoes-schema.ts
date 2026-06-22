import { z } from 'zod'

// Schemas da API de eventos da Câmara (ADR-046).
// GET /eventos — listagem; GET /eventos/{id}/deputados — lista de presença.
// Doc: https://dadosabertos.camara.leg.br/swagger/api.html

export const camaraEventoSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    uri: z.string(),
    dataHoraInicio: z.string(),
    descricaoTipo: z.string(),
    descricao: z.string().nullable().optional(),
    situacao: z.string().nullable().optional(),
  })
  .passthrough()
export type CamaraEvento = z.infer<typeof camaraEventoSchema>

// Deputado presente num evento — só o id importa (mapeia parlamentar.source_id).
export const camaraEventoDeputadoSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
  })
  .passthrough()

export const camaraEventoDeputadosEnvelopeSchema = z
  .object({
    dados: z.array(camaraEventoDeputadoSchema),
  })
  .passthrough()
