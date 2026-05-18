import { z } from 'zod'

// Schemas Zod dos cursors versionados (ADR-026). Cada lista paginada
// tem seu próprio schema — `v` é o discriminator de versão. Quando
// o ORDER BY mudar no futuro, criamos `CursorVotosV2` e o decoder
// rejeita v1 → caller faz redirect 308 para página 1.

/**
 * Cursor de votos recentes em `/parlamentares/[id]?votos_after=`.
 *
 * ORDER BY: `votacao.data_hora DESC, voto_nominal.id DESC`.
 *
 * Payload:
 * - `v=1`: versão atual
 * - `d`: epoch ms de `votacao.data_hora` do último item da página
 * - `id`: uuid v7 de `voto_nominal.id` do último item (tiebreaker)
 */
export const CursorVotosV1 = z.object({
  v: z.literal(1),
  d: z.number().int().positive(),
  id: z.string().uuid(),
})

export type CursorVotosV1Payload = z.infer<typeof CursorVotosV1>
