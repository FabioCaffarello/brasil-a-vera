import { z } from 'zod'

// Schema da resposta de GET /senador/{codigo}/filiacoes.
// Estrutura: { FiliacaoParlamentar: { Parlamentar: { Filiacoes: { Filiacao: [...] } } } }
// Cada Filiacao traz o partido + DataFiliacao (e DataDesfiliacao se encerrada).
// A API às vezes devolve `Filiacao` como objeto único (1 filiação) em vez de
// array; normalizamos no parser do orquestrador.

export const senadoFiliacaoSchema = z
  .object({
    Partido: z
      .object({
        SiglaPartido: z.string().min(1),
        NomePartido: z.string().nullable().optional(),
      })
      .passthrough(),
    DataFiliacao: z.string().min(1),
    DataDesfiliacao: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoFiliacao = z.infer<typeof senadoFiliacaoSchema>

export const senadoFiliacoesRespostaSchema = z
  .object({
    FiliacaoParlamentar: z
      .object({
        Parlamentar: z
          .object({
            Filiacoes: z
              .object({
                Filiacao: z
                  .union([senadoFiliacaoSchema, z.array(senadoFiliacaoSchema)])
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

// Extrai a lista de filiações, normalizando objeto-único → array e vazio → [].
export function extractFiliacoes(
  parsed: z.infer<typeof senadoFiliacoesRespostaSchema>,
): SenadoFiliacao[] {
  const f = parsed.FiliacaoParlamentar?.Parlamentar?.Filiacoes?.Filiacao
  if (f == null) return []
  return Array.isArray(f) ? f : [f]
}
