import { z } from 'zod'

// GET /senador/{codigo} — detalhe. Usamos só os dados básicos biográficos
// (ADR-049 emenda): nascimento e naturalidade. O Senado não expõe escolaridade
// nem profissão por aqui.
export const senadoDetalheSchema = z
  .object({
    DetalheParlamentar: z
      .object({
        Parlamentar: z
          .object({
            DadosBasicosParlamentar: z
              .object({
                DataNascimento: z.string().nullable().optional(),
                Naturalidade: z.string().nullable().optional(),
                UfNaturalidade: z.string().nullable().optional(),
              })
              .passthrough()
              .nullable()
              .optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough()

export type SenadoDetalhe = z.infer<typeof senadoDetalheSchema>
