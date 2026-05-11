import { z } from 'zod'

// Schema da resposta de GET /deputados/{id}/despesas.
// Documentação: https://dadosabertos.camara.leg.br/swagger/api.html
//
// Notas empíricas:
// - `valorDocumento`, `valorLiquido` e `valorGlosa` vêm como número JS
//   (não string). Convertidos para string no mapper para evitar perda
//   de precisão no banco (numeric com mode 'string').
// - `dataDocumento` vem como ISO datetime "YYYY-MM-DDTHH:mm:ss" mas para
//   nós só interessa a data — tipo `date` no banco. Cortamos a parte de
//   tempo no mapper.
// - `codTipoDocumento` frequentemente é 0 — não é erro, é o código real
//   para "Nota Fiscal" no sistema da Câmara.

export const camaraGastoSchema = z
  .object({
    ano: z.number().int(),
    mes: z.number().int(),
    tipoDespesa: z.string().min(1),
    codDocumento: z.union([z.string(), z.number()]).transform(String),
    tipoDocumento: z.string().nullable().optional(),
    codTipoDocumento: z.number().int(),
    dataDocumento: z.string().min(1),
    valorDocumento: z.number(),
    urlDocumento: z.string().url().nullable().optional(),
    nomeFornecedor: z.string().min(1),
    cnpjCpfFornecedor: z.string().nullable().optional(),
    valorGlosa: z.number().nullable().optional(),
  })
  .passthrough()

export type CamaraGasto = z.infer<typeof camaraGastoSchema>
