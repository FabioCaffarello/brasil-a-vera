import { z } from 'zod'

// Schemas para GET /frentes e GET /frentes/{id}/membros na API da Câmara.
//
// GET /frentes: lista paginada de frentes parlamentares.
// GET /frentes/{id}/membros: membros da frente (deputados com `titulo` do papel).
//
// ⚠️  Shapes validadas contra fixture real antes do merge (princípio 13).

// Item de GET /frentes.
export const camaraFrenteSchema = z
  .object({
    id: z.number().int(),
    titulo: z.string().min(1),
    idLegislatura: z.number().int().optional(),
  })
  .passthrough()

export type CamaraFrente = z.infer<typeof camaraFrenteSchema>

// Item de GET /frentes/{id}/membros.
// `id` é o source_id do deputado (mesmo espaço de ids de /deputados).
// `titulo` é o papel do parlamentar na frente (Presidente, Vice-Presidente, Membro…).
export const camaraFrenteMembroSchema = z
  .object({
    id: z.number().int(),
    nome: z.string().min(1),
    titulo: z.string().nullable().optional(),
  })
  .passthrough()

export type CamaraFrenteMembro = z.infer<typeof camaraFrenteMembroSchema>
