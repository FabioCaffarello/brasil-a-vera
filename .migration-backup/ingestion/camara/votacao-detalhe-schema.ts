import { z } from 'zod'

// Schema da resposta de GET /votacoes/{id} (detalhe).
// O campo crítico aqui é `proposicoesAfetadas` — array com a(s) proposição(ões)
// que a votação decidiu. `proposicao_` (singular) não vem mais; o objeto
// `objetosPossiveis[0]` traz o objeto procedimental específico (Emenda de
// Redação, Substitutivo, Requerimento) e não é o que queremos vincular.

const proposicaoRefSchema = z
  .object({
    id: z.number().int(),
    siglaTipo: z.string().min(1),
    numero: z.number().int(),
    ano: z.number().int(),
  })
  .passthrough()

export const camaraVotacaoDetalheSchema = z
  .object({
    id: z.string().min(1),
    proposicoesAfetadas: z.array(proposicaoRefSchema).optional(),
  })
  .passthrough()

export type CamaraVotacaoDetalhe = z.infer<typeof camaraVotacaoDetalheSchema>
