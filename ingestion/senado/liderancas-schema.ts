import { z } from 'zod'

// Schema de GET /composicao/lideranca no Senado.
//
// ⚠️  XML-convertido-em-JSON: elemento repetível vem como objeto único quando
//     há um só, array quando há vários. `oneOrMany` normaliza para array.
//
// ⚠️  Shape validada contra fixture real antes do merge (princípio 13).

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

// Membro individual de uma liderança.
const membroLiderancaSchema = z
  .object({
    CodigoParlamentar: z.union([z.string(), z.number()]).transform(String),
    NomeParlamentar: z.string().min(1),
    // Papel: "Lider" | "Vice-Lider" | outros (conservador: passthrough)
    Papel: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoMembroLideranca = z.infer<typeof membroLiderancaSchema>

// Bloco de liderança (partido ou posição institucional).
const liderancaBlocoSchema = z
  .object({
    // Nome/sigla da entidade: "PT", "MDB", "Governo", "Oposição", etc.
    SiglaLideranca: z.string().min(1),
    NomeLideranca: z.string().nullable().optional(),
    DescricaoLideranca: z.string().nullable().optional(),
    Membros: z
      .object({
        Membro: oneOrMany(membroLiderancaSchema).optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough()

export type SenadoLiderancaBloco = z.infer<typeof liderancaBlocoSchema>

// Envelope raiz do endpoint.
export const senadoLiderancasEnvelopeSchema = z
  .object({
    ListaLiderancas: z
      .object({
        Lideranca: oneOrMany(liderancaBlocoSchema).optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type SenadoLiderancasEnvelope = z.infer<
  typeof senadoLiderancasEnvelopeSchema
>
