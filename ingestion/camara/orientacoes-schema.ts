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
// Ingestão (ADR-040) retém `codTipoLideranca === "P"` (orientações
// partidárias, casam com `parlamentar.partidoSigla`) e `=== "B"` quando a
// sigla é bloco institucional (Governo/Oposição/Maioria/Minoria). Federações
// e blocos ad-hoc ("Fdr ...", "Bl ...") e `orientacaoVoto === ""` são
// descartados. Discriminação via classificarOrientacao (orientacoes-mapper).

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
