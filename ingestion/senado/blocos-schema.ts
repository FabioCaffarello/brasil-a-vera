import { z } from 'zod'

// Schemas para GET /composicao/lista/blocos e GET /composicao/bloco/{codigo}
// no Senado Federal.
//
// ⚠️  XML-convertido-em-JSON: elemento repetível vem como objeto único quando
//     há um só, array quando há vários. `oneOrMany` normaliza para array.
// ⚠️  Shapes validadas contra fixture real antes do merge (princípio 13).

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

// Item de /composicao/lista/blocos — lista de códigos de blocos.
const senadoBlocoItemSchema = z
  .object({
    CodigoBloco: z.union([z.string(), z.number()]).transform(String),
    NomeBloco: z.string().min(1),
    NomeApelido: z.string().nullable().optional(),
  })
  .passthrough()

export const senadoBlocosListaSchema = z
  .object({
    ListaBlocos: z
      .object({
        Bloco: oneOrMany(senadoBlocoItemSchema).optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type SenadoBlocosLista = z.infer<typeof senadoBlocosListaSchema>

// Partido dentro do detalhe de /composicao/bloco/{codigo}.
const senadoPartidoBlocoSchema = z
  .object({
    SiglaPartido: z.string().min(1),
    NomePartido: z.string().nullable().optional(),
  })
  .passthrough()

// Detalhe de /composicao/bloco/{codigo}.
export const senadoBlocoDetalheSchema = z
  .object({
    DetalhesBloco: z
      .object({
        Codigo: z.union([z.string(), z.number()]).transform(String),
        Nome: z.string().min(1),
        NomeApelido: z.string().nullable().optional(),
        Partidos: z
          .object({
            Partido: oneOrMany(senadoPartidoBlocoSchema).optional(),
          })
          .nullable()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type SenadoBlocoDetalhe = z.infer<typeof senadoBlocoDetalheSchema>
