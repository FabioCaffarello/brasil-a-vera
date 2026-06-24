import { z } from 'zod'

// Schema para GET /legislaturas/{id}/mesa na API da Câmara.
// Retorna os membros da Mesa Diretora da legislatura corrente (sem paginação).
//
// ⚠️  Shape validada contra fixture real antes do merge (princípio 13).
//     Campos não usados ficam em .passthrough() para evitar rejeição silenciosa.

export const camaraMesaItemSchema = z
  .object({
    id: z.number().int(),
    nome: z.string().min(1),
    // "Presidente" | "1º Vice-Presidente" | "1º Secretário" | "1º Suplente de Secretário" etc.
    titulo: z.string().nullable().optional(),
    siglaPartido: z.string().nullable().optional(),
    siglaUf: z.string().nullable().optional(),
  })
  .passthrough()

export type CamaraMesaItem = z.infer<typeof camaraMesaItemSchema>
