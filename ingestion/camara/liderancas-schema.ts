import { z } from 'zod'

// Schemas para GET /partidos e GET /partidos/{id}/lideres na API da Câmara.
//
// ⚠️  Shapes validadas contra fixture real antes do merge (princípio 13).
//     Campos não usados ficam em .passthrough() para evitar rejeição silenciosa.

// Item de GET /partidos (lista paginada de partidos ativos).
export const camaraPartidoSchema = z
  .object({
    id: z.number().int(),
    sigla: z.string().min(1),
    nome: z.string().min(1),
  })
  .passthrough()

export type CamaraPartido = z.infer<typeof camaraPartidoSchema>

// Item de GET /partidos/{id}/lideres.
// `titulo` discrimina líder vs. vice-líder ("Líder", "Vice-Líder", "1º Vice-Líder"…).
// `id` é o source_id do deputado (mesmo espaço de ids de /deputados).
export const camaraLiderSchema = z
  .object({
    id: z.number().int(),
    nome: z.string().min(1),
    titulo: z.string().nullable().optional(),
    idLegislatura: z.number().int().optional(),
    siglaPartido: z.string().nullable().optional(),
  })
  .passthrough()

export type CamaraLider = z.infer<typeof camaraLiderSchema>
