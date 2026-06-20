import { z } from 'zod'

// Schema da resposta de GET /senador/{codigo}/discursos.
// Estrutura: DiscursosParlamentar.Parlamentar.Pronunciamentos.Pronunciamento[].
// `Pronunciamentos` é null quando não há discursos na janela; `Pronunciamento`
// pode vir objeto único (1) em vez de array — normalizado no extractor.
// O texto integral vem por URL (`UrlTexto`), não inline (ADR-016 aplica direto).

export const senadoPronunciamentoSchema = z
  .object({
    CodigoPronunciamento: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),
    DataPronunciamento: z.string().min(1),
    TipoUsoPalavra: z
      .object({ Descricao: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    TextoResumo: z.string().nullable().optional(),
    Indexacao: z.string().nullable().optional(),
    UrlTexto: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoPronunciamento = z.infer<typeof senadoPronunciamentoSchema>

export const senadoDiscursosRespostaSchema = z
  .object({
    DiscursosParlamentar: z
      .object({
        Parlamentar: z
          .object({
            Pronunciamentos: z
              .object({
                Pronunciamento: z
                  .union([
                    senadoPronunciamentoSchema,
                    z.array(senadoPronunciamentoSchema),
                  ])
                  .optional(),
              })
              .passthrough()
              .nullable()
              .optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export function extractPronunciamentos(
  parsed: z.infer<typeof senadoDiscursosRespostaSchema>,
): SenadoPronunciamento[] {
  const p =
    parsed.DiscursosParlamentar?.Parlamentar?.Pronunciamentos?.Pronunciamento
  if (p == null) return []
  return Array.isArray(p) ? p : [p]
}
