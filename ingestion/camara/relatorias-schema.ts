import { z } from 'zod'

// Schema do subset relevante de GET /proposicoes/{id} para extrair o relator
// vigente. `statusProposicao.uriUltimoRelator` é a URL do deputado relator
// (…/deputados/{id}) ou null quando não há relator designado (ADR-044).
// Documentação: https://dadosabertos.camara.leg.br/swagger/api.html
export const camaraProposicaoDetalheSchema = z
  .object({
    dados: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String),
        statusProposicao: z
          .object({
            uriUltimoRelator: z.string().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type CamaraProposicaoDetalhe = z.infer<
  typeof camaraProposicaoDetalheSchema
>
