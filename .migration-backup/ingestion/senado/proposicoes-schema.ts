import { z } from 'zod'

// Schema da resposta de GET /processo no Senado (substitui o antigo
// /materia/atualizadas, descontinuado em 2026-02-01). Retorna array flat
// em JSON moderno (não-XML-style).

export const senadoProcessoSchema = z
  .object({
    id: z.number().int(),
    codigoMateria: z.number().int(),
    identificacao: z.string().min(1),
    ementa: z.string(),
    autoria: z.string().nullable().optional(),
    casaIdentificadora: z.string().nullable().optional(),
    dataApresentacao: z.string().min(1),
    dataUltimaAtualizacao: z.string().nullable().optional(),
    tipoConteudo: z.string().nullable().optional(),
    tipoDocumento: z.string().nullable().optional(),
    tramitando: z.string().min(1),
    urlDocumento: z.string().url().nullable().optional(),
  })
  .passthrough()

export type SenadoProcesso = z.infer<typeof senadoProcessoSchema>
