// Erase LGPD (eliminação reversível por 30 dias) — Wave 10 Etapa 9.4.
//
// Soft delete: SET deleted_at = now() em user_profile. Dados pessoais
// continuam no banco durante a janela de 30 dias para permitir
// reativação. Hard delete agendado via cron diário na Etapa 9.6,
// que remove o user_profile e cascade limpa follows, alert_policy,
// alert_delivery. `consent_log` permanece (FK nullable, SET NULL).
//
// Idempotente: re-aplicar preserva o `deleted_at` original via
// COALESCE; o usuário pode clicar "Apagar" duas vezes sem alterar
// o relógio de hard delete.

import { eq, sql } from 'drizzle-orm'

import { userProfile } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export async function eraseUser(internalUserId: string): Promise<void> {
  await db
    .update(userProfile)
    .set({
      deletedAt: sql`COALESCE(${userProfile.deletedAt}, now())`,
      updatedAt: sql`now()`,
    })
    .where(eq(userProfile.id, internalUserId))
}
