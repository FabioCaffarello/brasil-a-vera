import { z } from 'zod'

// Schema da resposta de GET /votacoes/{id}/orientacoes na API da Câmara.
// Estrutura observada (probe empírico 2026-05-13 sobre PEC 383/2017):
//   {
//     "orientacaoVoto": "Sim" | "Não" | "Liberado" | "" | ...,
//     "codTipoLideranca": "P" (partido) | "B" (bloco),
//     "siglaPartidoBloco": "PT" | "Governo" | "Fdr PT-PCdoB-PV" | ...,
//     "codPartidoBloco": 36844 | null (null para blocos não-partidários),
//     "uriPartidoBloco": "https://..." | null
//   }
//
// Ingestão filtra `codTipoLideranca === "P"` (orientações partidárias) e
// `orientacaoVoto !== ""` — só essas casam com `parlamentar.partidoSigla`
// no consumer (`getAlinhamentoParlamentar`).

export const camaraOrientacaoSchema = z
  .object({
    orientacaoVoto: z.string().nullable().optional(),
    codTipoLideranca: z.string().min(1),
    siglaPartidoBloco: z.string().min(1),
    codPartidoBloco: z.number().int().nullable().optional(),
    uriPartidoBloco: z.string().url().nullable().optional(),
  })
  .passthrough()

export type CamaraOrientacao = z.infer<typeof camaraOrientacaoSchema>
