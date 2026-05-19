// Queries para a tabela `usuario.follows` — Wave 10 Etapa 2.
//
// Drizzle direto, sem cache (decisão da Etapa 2 — divergência consciente
// de LOGGED-AREA-VISION §4). ADR-019: adiar `cached()` até evidência
// empírica de CU-hours alto no Neon; per-user data tem cache hit ratio
// baixíssimo e exigiria invalidação on-write (não disponível na API
// atual de `cached()`).
//
// Cap operacional: 200 follows por usuário, enforçado aqui via SELECT
// count(*) antes do INSERT. ADR-029 §5: valor calibrado para Câmara
// (513 deputados) com folga.

import { and, count, desc, eq, inArray } from 'drizzle-orm'

import {
  estatisticaParlamentarAgregada,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import { follows } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export const FOLLOWS_CAP_PER_USER = 200

/**
 * Retorna o `Set<parlamentarId>` que o usuário acompanha. Set facilita
 * lookups O(1) ao renderizar listagem de parlamentares com botão
 * Acompanhar/Acompanhando.
 *
 * `userId` é o `user_profile.id` interno (UUIDv7), NÃO o clerk_user_id.
 * Caller resolve via `getOrCreateUserProfileId()`.
 */
export async function getFollowsByUserId(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ parlamentarId: follows.parlamentarId })
    .from(follows)
    .where(eq(follows.userId, userId))
  return new Set(rows.map((r) => r.parlamentarId))
}

/**
 * Conta quantos parlamentares o usuário acompanha. Útil para KPIs do
 * /painel sem ter que materializar o Set inteiro.
 */
export async function countFollowsByUserId(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(follows)
    .where(eq(follows.userId, userId))
  return row?.n ?? 0
}

export type AddFollowResult =
  | { ok: true }
  | { ok: false; reason: 'cap_exceeded' }

/**
 * Adiciona um follow idempotente. INSERT ON CONFLICT DO NOTHING: clicar
 * duas vezes no botão (race condition) não causa erro.
 *
 * Retorna `cap_exceeded` se o usuário já está em FOLLOWS_CAP_PER_USER.
 * Caller (API route) traduz para 422 HTTP.
 */
export async function addFollow(
  userId: string,
  parlamentarId: string,
): Promise<AddFollowResult> {
  // Check cap antes do INSERT. Tem race condition teórica
  // (count = 199 → outra request entra → cap = 201) mas tolerável
  // dado que o cap é orientação operacional, não invariante de banco.
  const total = await countFollowsByUserId(userId)
  if (total >= FOLLOWS_CAP_PER_USER) {
    return { ok: false, reason: 'cap_exceeded' }
  }

  await db
    .insert(follows)
    .values({ userId, parlamentarId })
    .onConflictDoNothing()

  return { ok: true }
}

/**
 * Remove um follow. Idempotente: DELETE em linha inexistente é no-op.
 */
export async function removeFollow(
  userId: string,
  parlamentarId: string,
): Promise<void> {
  await db
    .delete(follows)
    .where(
      and(eq(follows.userId, userId), eq(follows.parlamentarId, parlamentarId)),
    )
}

/**
 * Remove vários follows numa única operação. Usado pelo modal de
 * revisão de UF (Wave 10 Etapa 4) que pode desacompanhar dezenas em
 * um clique. Idempotente; lista vazia é no-op.
 */
export async function removeFollowsBatch(
  userId: string,
  parlamentarIds: string[],
): Promise<void> {
  if (parlamentarIds.length === 0) return
  await db
    .delete(follows)
    .where(
      and(
        eq(follows.userId, userId),
        inArray(follows.parlamentarId, parlamentarIds),
      ),
    )
}

/**
 * Lista parlamentares acompanhados com metadados completos para
 * renderização do `ParlamentarCard` (Wave 10 Etapa 4 sub-tab
 * "Acompanhando"). JOIN com `parlamentar` para nome/foto/partido + LEFT
 * JOIN com o agregado para a barra de alinhamento. Ordena por
 * `followed_at DESC` (mais recente primeiro).
 */
export async function getFollowsWithParlamentarMeta(userId: string) {
  return db
    .select({
      id: parlamentar.id,
      nome: parlamentar.nome,
      casa: parlamentar.casa,
      partidoSigla: parlamentar.partidoSigla,
      uf: parlamentar.uf,
      urlFoto: parlamentar.urlFoto,
      pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
      votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
      followedAt: follows.followedAt,
    })
    .from(follows)
    .innerJoin(parlamentar, eq(follows.parlamentarId, parlamentar.id))
    .leftJoin(
      estatisticaParlamentarAgregada,
      eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
    )
    .where(eq(follows.userId, userId))
    .orderBy(desc(follows.followedAt))
}
