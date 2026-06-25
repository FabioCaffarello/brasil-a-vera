import { z } from 'zod'

// Schema de GET /processo/relatoria?codigoParlamentar={id} (ADR-060).
//
// Migração do endpoint legado /senador/{id}/relatorias (descontinuado em
// 2026-02-01, removido do código em Sprint 15.0). O novo endpoint retorna
// um flat JSON array — sem a quirk XML-to-JSON do legado.
//
// Probe empírico 2026-06-24 (senador 5936):
//   items: 219 · tipos: Relator(205) Ad hoc(13) Revisor(1)
//   dataDesignacao format: "YYYY-MM-DD HH:MM:SS"

export const relatoriaProcItemSchema = z
  .object({
    codigoMateria: z.union([z.string(), z.number()]).transform(String),
    descricaoTipoRelator: z.string(),
    dataDesignacao: z.string().nullable().optional(),
    dataDestituicao: z.string().nullable().optional(),
  })
  .passthrough()

export const relatoriaProcResponseSchema = z.array(relatoriaProcItemSchema)

export type RelatoriaProcItem = z.infer<typeof relatoriaProcItemSchema>
export type RelatoriaProcResponse = z.infer<typeof relatoriaProcResponseSchema>
