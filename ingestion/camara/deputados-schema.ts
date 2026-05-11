import { z } from 'zod'

// Schema Zod para a resposta de GET /deputados na API da Câmara dos Deputados.
// A spec do endpoint está em https://dadosabertos.camara.leg.br/swagger/api.html
// Validamos no boundary externo — qualquer mudança incompatível na API
// causa erro de validação cedo, em vez de propagar para o banco.

export const camaraDeputadoListagemSchema = z.object({
  id: z.number().int(),
  nome: z.string().min(1),
  siglaPartido: z.string().min(1),
  siglaUf: z.string().length(2),
  idLegislatura: z.number().int(),
  urlFoto: z.string().url().nullable().optional(),
  uri: z.string().url(),
})

export type CamaraDeputadoListagem = z.infer<
  typeof camaraDeputadoListagemSchema
>
