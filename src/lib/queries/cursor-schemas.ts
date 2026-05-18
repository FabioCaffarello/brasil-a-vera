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
 * Cursor de proposições — serve dois consumers com ORDER BY idêntico:
 *
 * - **Proposições autoradas** em `/parlamentares/[id]?propos_after=`
 *   (Wave 7 Sprint 7.3 PR3)
 * - **Listagem global** em `/proposicoes?after=` (Wave 8 Sprint 8.1 PR5)
 *
 * Reuso justificado: o cursor é contrato de "como avançar na ordem", não
 * "qual filtro está aplicado". Filtros são da query; cursor só posiciona o
 * ponteiro. Mesmo ORDER BY → mesmo schema. Se em algum momento os dois
 * consumers divergirem em ordenação, split em `CursorProposicoesAutorV1`
 * + `CursorProposicoesListaV1` é trivial (ADR-026 §versionamento permite).
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

/**
 * Cursor de eventos de tramitação em
 * `/proposicoes/[tipo]/[numero]/[ano]?tram_after=` (Wave 8 Sprint 8.3 PR1).
 *
 * Schema idêntico em shape a `CursorVotosV1` e `CursorGastosV1`, mas
 * mantido como entidade própria pela mesma razão da separação votos/gastos
 * — lista distinta, semântica distinta, evolução independente de ORDER BY.
 *
 * ORDER BY: `tramitacao.data DESC, tramitacao.id DESC`.
 *
 * Payload:
 * - `v=1`: versão atual
 * - `d`: epoch ms de `tramitacao.data` do último item da página
 * - `id`: uuid v7 de `tramitacao.id` do último item (tiebreaker)
 */
export const CursorTramitacaoV1 = z.object({
  v: z.literal(1),
  d: z.number().int().positive(),
  id: z.string().uuid(),
})

export type CursorTramitacaoV1Payload = z.infer<typeof CursorTramitacaoV1>

/**
 * Cursor de listagem de votações em `/votacoes?after=` (Wave 9
 * Sprint 9.1 PR3). Schema idêntico em shape a `CursorVotosV1`,
 * `CursorGastosV1` e `CursorTramitacaoV1`, mas mantido como entidade
 * própria — lista distinta, semântica distinta, evolução independente
 * de ORDER BY conforme ADR-026 §versionamento.
 *
 * ORDER BY: `votacao.data_hora DESC, votacao.id DESC`.
 *
 * Payload:
 * - `v=1`: versão atual
 * - `d`: epoch ms de `votacao.data_hora` do último item da página
 * - `id`: uuid v7 de `votacao.id` do último item (tiebreaker)
 */
export const CursorVotacoesV1 = z.object({
  v: z.literal(1),
  d: z.number().int().positive(),
  id: z.string().uuid(),
})

export type CursorVotacoesV1Payload = z.infer<typeof CursorVotacoesV1>
