import { z } from 'zod'

// Schema de GET /composicao/lideranca no Senado.
//
// ⚠️  API migrou de formato XML-nested para flat JSON array em 2026-07.
//     Cada item representa um parlamentar em uma liderança.
//     Filtrar por `casa === 'SF'` para ficar só com o Senado.
//
// ⚠️  Shape validada contra fixture real antes do merge (princípio 13).

export const senadoLiderancaItemSchema = z
  .object({
    casa: z.string(),
    codigo: z.union([z.string(), z.number()]).transform(String),
    codigoParlamentar: z.union([z.string(), z.number()]).transform(String),
    siglaPartidoFiliacao: z.string().nullable().optional(),
    siglaTipoLideranca: z.string().nullable().optional(),
    siglaTipoUnidadeLideranca: z.string().nullable().optional(),
    descricaoTipoLideranca: z.string().nullable().optional(),
    nomeParlamentar: z.string().nullable().optional(),
    dataDesignacao: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoLiderancaItem = z.infer<typeof senadoLiderancaItemSchema>

export const senadoLiderancasSchema = z.array(senadoLiderancaItemSchema)

export type SenadoLiderancas = z.infer<typeof senadoLiderancasSchema>
