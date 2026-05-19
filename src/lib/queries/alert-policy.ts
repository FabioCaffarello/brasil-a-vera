// Queries para `usuario.alert_policy` — Wave 10 Etapa 3.
//
// Esta tabela é antecipada para persistir as escolhas do passo 3 do
// wizard de onboarding. UI completa de gerenciamento (sub-tab Políticas
// em /painel/alertas) entra na Etapa 6.

import { eq, sql } from 'drizzle-orm'

import { alertPolicy } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export interface TopicSelection {
  topicVotacoes: boolean
  topicGastos: boolean
  topicProposicoes: boolean
  topicDiscursos: boolean
  topicDivergencias: boolean
}

// Defaults para o caso de pulo total do wizard (LOGGED-AREA-VISION §5.6).
// Justificativa: entregam valor sem inundar — usuário pula → recebe
// report com 3 sinais conservadores; ajusta depois em Políticas (Etapa 6).
export const SKIP_ALL_TOPIC_DEFAULTS: TopicSelection = {
  topicVotacoes: true,
  topicProposicoes: true,
  topicDivergencias: true,
  topicGastos: false,
  topicDiscursos: false,
}

/**
 * Upsert da `alert_policy` do usuário a partir das escolhas do wizard.
 * Outras colunas (cadence, channel_*, boost_*) ficam nos defaults
 * declarados no schema — Etapa 6 expõe configuração.
 *
 * `userId` é o `user_profile.id` interno (UUIDv7).
 */
export async function upsertAlertPolicyTopics(
  userId: string,
  topics: TopicSelection,
): Promise<void> {
  await db
    .insert(alertPolicy)
    .values({
      userId,
      ...topics,
    })
    .onConflictDoUpdate({
      target: alertPolicy.userId,
      set: {
        ...topics,
        updatedAt: sql`now()`,
      },
    })
}

export async function getAlertPolicy(userId: string) {
  const rows = await db
    .select()
    .from(alertPolicy)
    .where(eq(alertPolicy.userId, userId))
    .limit(1)
  return rows[0]
}
