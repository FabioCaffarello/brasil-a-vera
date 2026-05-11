import { z } from 'zod'

// Schemas Zod para a resposta de GET /senador/lista/atual.
// A API retorna estrutura nested XML-style com nomes longos e PascalCase.
// Validamos só os campos que usamos; o resto da resposta é ignorado.

const numericString = z.string().regex(/^\d+$/, 'esperado dígitos')

const legislaturaSchema = z.object({
  NumeroLegislatura: numericString,
})

const identificacaoSchema = z.object({
  CodigoParlamentar: numericString,
  NomeParlamentar: z.string().min(1),
  NomeCompletoParlamentar: z.string().min(1).optional(),
  SiglaPartidoParlamentar: z.string().min(1),
  UfParlamentar: z.string().length(2),
  UrlFotoParlamentar: z.string().url().optional(),
  UrlPaginaParlamentar: z.string().url().optional(),
})

const mandatoSchema = z.object({
  UfParlamentar: z.string().length(2).optional(),
  PrimeiraLegislaturaDoMandato: legislaturaSchema.optional(),
  SegundaLegislaturaDoMandato: legislaturaSchema.optional(),
})

export const senadorItemSchema = z.object({
  IdentificacaoParlamentar: identificacaoSchema,
  Mandato: mandatoSchema.optional(),
})

export type SenadorItem = z.infer<typeof senadorItemSchema>

// Envelope completo da resposta.
export const listaSenadoresEnvelopeSchema = z.object({
  ListaParlamentarEmExercicio: z.object({
    Parlamentares: z.object({
      // Em casos extremos (lista vazia), `Parlamentar` pode vir ausente.
      Parlamentar: z.array(z.unknown()).optional(),
    }),
  }),
})
