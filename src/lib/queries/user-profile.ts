// Queries para a tabela `usuario.user_profile` (Wave 10 Etapa 1).
//
// Sem repository wrapper / DAL — Drizzle direto, conforme ADR-029 §Princípios
// (anti-pattern #4 do LOGGED-AREA-VISION §12). Funções são puras o suficiente
// para serem chamadas tanto do lazy upsert (RSC do /painel) quanto de jobs
// futuros (Etapa 9 LGPD: soft delete via botão "Apagar conta" em /meus-dados).

import { eq, sql } from 'drizzle-orm'

import { userProfile } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export interface UpsertUserProfileInput {
  clerkUserId: string
  email: string
  displayName: string | null
}

/**
 * Upsert idempotente do user_profile a partir do snapshot atual do Clerk.
 * Chamado pelo lazy upsert na RSC do /painel (primeiro hit autenticado;
 * também serve quando email/nome muda no Clerk Account Portal e usuário
 * abre o /painel depois). ON CONFLICT por `clerk_user_id` (unique index).
 *
 * NOTA: este upsert **NÃO** ressuscita conta soft-deletada. Se
 * `deleted_at` está setado, preserva — só atualiza `email` e
 * `display_name` (Clerk pode mudar enquanto Clerk session sobrevive).
 * Ressurreição é fluxo de re-autenticação (ADR-031 §Reativação, Etapa 9).
 */
export async function upsertUserProfileFromClerk(
  input: UpsertUserProfileInput,
): Promise<void> {
  await db
    .insert(userProfile)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email,
      displayName: input.displayName,
    })
    .onConflictDoUpdate({
      target: userProfile.clerkUserId,
      set: {
        email: input.email,
        displayName: input.displayName,
        updatedAt: sql`now()`,
      },
    })
}

/**
 * Soft delete do user_profile. Setamos `deleted_at = now()`; hard delete
 * via cron diário aos 30 dias (ADR-031 §3, Etapa 9). Idempotente: se já
 * estava soft-deleted, preserva o `deleted_at` original (não sobrescreve).
 *
 * Disparado em Etapa 9 (LGPD) pelo botão "Apagar minha conta" no
 * dashboard `/painel/configuracoes/meus-dados`. Não há webhook do Clerk
 * configurado nesta wave — método tradicional (lazy upsert no /painel).
 */
export async function softDeleteUserProfile(
  clerkUserId: string,
): Promise<void> {
  await db
    .update(userProfile)
    .set({
      deletedAt: sql`COALESCE(${userProfile.deletedAt}, now())`,
      updatedAt: sql`now()`,
    })
    .where(eq(userProfile.clerkUserId, clerkUserId))
}

/**
 * Lookup por `clerk_user_id` (FK opaca usada em RSC de rotas
 * autenticadas para resolver o user_profile.id interno). Retorna
 * undefined se não existir ainda — caller faz lazy upsert via
 * `currentUser()` do Clerk.
 */
export async function findUserProfileByClerkId(clerkUserId: string) {
  const rows = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.clerkUserId, clerkUserId))
    .limit(1)
  return rows[0]
}
