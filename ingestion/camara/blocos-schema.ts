import { z } from 'zod'

// Schemas para GET /blocos e GET /blocos/{id} na API da Câmara.
//
// GET /blocos retorna a lista paginada com id/nome/legislatura.
// GET /blocos/{id} retorna o detalhe incluindo o array `partidos`
// com a composição do bloco.
//
// ⚠️  Shapes validadas contra fixture real antes do merge (princípio 13).

// Item de GET /blocos (lista paginada).
export const camaraBlocoListSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    nome: z.string().min(1),
    idLegislatura: z.coerce.number().int().optional(),
  })
  .passthrough()

export type CamaraBlocoList = z.infer<typeof camaraBlocoListSchema>

// Partido dentro do detalhe de GET /blocos/{id}.
const camaraPartidoBlocoSchema = z
  .object({
    sigla: z.string().min(1),
  })
  .passthrough()

// Detalhe de GET /blocos/{id} (envelopado em `{ dados: {...} }`).
export const camaraBlocoDetalheSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    nome: z.string().min(1),
    idLegislatura: z.coerce.number().int().optional(),
    partidos: z.array(camaraPartidoBlocoSchema).optional(),
  })
  .passthrough()

export type CamaraBlocoDetalhe = z.infer<typeof camaraBlocoDetalheSchema>
