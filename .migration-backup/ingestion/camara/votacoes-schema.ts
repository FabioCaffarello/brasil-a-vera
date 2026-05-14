import { z } from 'zod'

// Schema da resposta de GET /votacoes na API da Câmara.
// O endpoint suporta filtros: idLegislatura, dataInicio, dataFim, itens, pagina.

// A API pode retornar `aprovacao` como 0|1, true|false ou null em algumas
// edge cases (votação não concluída). Normalizamos para boolean abaixo.
const aprovacaoSchema = z
  .union([z.literal(0), z.literal(1), z.boolean(), z.null()])
  .transform((v) => v === 1 || v === true)

export const camaraVotacaoListagemSchema = z
  .object({
    id: z.string().min(1),
    uri: z.string().url(),
    data: z.string().min(1),
    dataHoraRegistro: z.string().min(1),
    siglaOrgao: z.string().min(1),
    descricao: z.string().min(1),
    aprovacao: aprovacaoSchema,
    // Pode vir como `uriProposicaoPrincipal` (string) ou `proposicao_` (objeto)
    // dependendo do endpoint/versão. Nenhum dos dois é obrigatório.
  })
  .passthrough()

export type CamaraVotacaoListagem = z.infer<typeof camaraVotacaoListagemSchema>
