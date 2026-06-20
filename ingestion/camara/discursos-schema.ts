import { z } from 'zod'

// Schema da resposta de GET /deputados/{id}/discursos.
// `transcricao` (texto integral) é capturada mas NÃO persistida (ADR-016).
// `urlTexto` costuma vir null (o texto só existe inline).

export const camaraDiscursoSchema = z
  .object({
    dataHoraInicio: z.string().min(1),
    tipoDiscurso: z.string().nullable().optional(),
    faseEvento: z
      .object({ titulo: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    sumario: z.string().nullable().optional(),
    keywords: z.string().nullable().optional(),
    urlTexto: z.string().nullable().optional(),
  })
  .passthrough()

export type CamaraDiscurso = z.infer<typeof camaraDiscursoSchema>

export const camaraDiscursosRespostaSchema = z
  .object({
    dados: z.array(camaraDiscursoSchema).optional(),
  })
  .passthrough()
