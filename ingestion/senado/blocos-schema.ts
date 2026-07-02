import { z } from 'zod'

// Schema para GET /dados/ListaBlocoParlamentar.json no Senado.
//
// ⚠️  O endpoint original /composicao/lista/blocos → /composicao/bloco/{codigo}
//     (dois passos) foi substituído por este arquivo JSON unificado em 2026-07.
//     O novo endpoint retorna todos os blocos com membros em uma única chamada.
//
// ⚠️  Formato XML-convertido-em-JSON: elemento repetível pode vir como
//     objeto único quando há um só, array quando há vários. `oneOrMany` normaliza.
//
// ⚠️  Shape validada contra fixture real antes do merge (princípio 13).

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

const senadoPartidoMembroSchema = z
  .object({
    Partido: z
      .object({
        SiglaPartido: z.string().min(1),
        NomePartido: z.string().nullable().optional(),
        CodigoPartido: z
          .union([z.string(), z.number()])
          .transform(String)
          .optional(),
      })
      .passthrough(),
    DataAdesao: z.string().nullable().optional(),
  })
  .passthrough()

export const senadoBlocoItemSchema = z
  .object({
    CodigoBloco: z.union([z.string(), z.number()]).transform(String),
    NomeBloco: z.string().min(1),
    NomeApelido: z.string().nullable().optional(),
    DataCriacao: z.string().nullable().optional(),
    Membros: z
      .object({
        Membro: oneOrMany(senadoPartidoMembroSchema).optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough()

export type SenadoBlocoItem = z.infer<typeof senadoBlocoItemSchema>

export const senadoBlocosListaSchema = z
  .object({
    Blocos: z
      .object({
        Bloco: oneOrMany(senadoBlocoItemSchema).optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type SenadoBlocosLista = z.infer<typeof senadoBlocosListaSchema>
