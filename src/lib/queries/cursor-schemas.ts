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

/**
 * Cursor de proposições autoradas em
 * `/parlamentares/[id]?propos_after=`.
 *
 * ORDER BY: `proposicao.ano DESC, proposicao.numero DESC,
 * proposicao.id DESC`.
 *
 * Payload:
 * - `v=1`: versão atual
 * - `a`: ano da proposição do último item da página
 * - `n`: numero da proposição do último item
 * - `id`: uuid v7 de `proposicao.id` do último item (tiebreaker)
 */
export const CursorProposicoesV1 = z.object({
  v: z.literal(1),
  a: z.number().int().min(1900).max(2200),
  n: z.number().int().positive(),
  id: z.string().uuid(),
})

export type CursorProposicoesV1Payload = z.infer<typeof CursorProposicoesV1>

/**
 * Cursor de gastos detalhados em
 * `/parlamentares/[id]/gastos?after=`.
 *
 * ORDER BY: `gasto.data_emissao DESC, gasto.id DESC`.
 *
 * Payload:
 * - `v=1`: versão atual
 * - `d`: epoch ms de `data_emissao` (interpretado como midnight UTC da
 *   data DATE) do último item da página
 * - `id`: uuid v7 de `gasto.id` do último item (tiebreaker)
 */
export const CursorGastosV1 = z.object({
  v: z.literal(1),
  d: z.number().int().positive(),
  id: z.string().uuid(),
})

export type CursorGastosV1Payload = z.infer<typeof CursorGastosV1>
