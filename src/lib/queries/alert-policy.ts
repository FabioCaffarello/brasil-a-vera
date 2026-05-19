// Queries para `usuario.alert_policy` — Wave 10 Etapa 3 + Etapa 6.
//
// Etapa 3 antecipou a tabela para persistir as escolhas do passo 3 do
// wizard de onboarding. Etapa 6 adiciona UI completa em
// /painel/alertas sub-tab Políticas com replace inteiro.
//
// Tipos e defaults (constants) vivem em `src/lib/constants/alert-policy.ts`
// para evitar acoplamento com `db` (Neon driver) em testes e client
// components.

import { eq, sql } from 'drizzle-orm'

import {
  type AlertPolicyFields,
  DEFAULT_ALERT_POLICY,
  SKIP_ALL_TOPIC_DEFAULTS,
  type TopicSelection,
} from '@/lib/constants/alert-policy'
import { alertPolicy } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

// Re-exports para preservar imports antigos.
export {
  type AlertPolicyFields,
  DEFAULT_ALERT_POLICY,
  SKIP_ALL_TOPIC_DEFAULTS,
  type TopicSelection,
}

/**
 * Upsert da `alert_policy` do usuário a partir das escolhas do wizard.
 * Outras colunas (cadence, channel_*, boost_*) ficam nos defaults
 * declarados no schema — Etapa 6 expõe configuração via
 * `upsertAlertPolicy`.
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

/**
 * Lê a policy do banco; se não existir ainda, retorna os defaults —
 * semântica "first read shows defaults sem persistir nada". O form
 * salva idempotentemente via `upsertAlertPolicy` no save.
 */
export async function getAlertPolicyOrDefaults(
  userId: string,
): Promise<AlertPolicyFields> {
  const row = await getAlertPolicy(userId)
  if (!row) return DEFAULT_ALERT_POLICY
  return {
    cadence: row.cadence as AlertPolicyFields['cadence'],
    channelEmail: row.channelEmail,
    channelInapp: row.channelInapp,
    topicVotacoes: row.topicVotacoes,
    topicGastos: row.topicGastos,
    topicProposicoes: row.topicProposicoes,
    topicDiscursos: row.topicDiscursos,
    topicDivergencias: row.topicDivergencias,
    boostEleicoes: row.boostEleicoes,
    boostCpis: row.boostCpis,
    boostProposicoesMarcadas: row.boostProposicoesMarcadas,
  }
}

/**
 * Replace inteiro da policy do usuário (Wave 10 Etapa 6 — form
 * Políticas). INSERT ON CONFLICT DO UPDATE: cobre tanto primeira
 * gravação quanto edição.
 */
export async function upsertAlertPolicy(
  userId: string,
  policy: AlertPolicyFields,
): Promise<void> {
  await db
    .insert(alertPolicy)
    .values({
      userId,
      ...policy,
    })
    .onConflictDoUpdate({
      target: alertPolicy.userId,
      set: {
        ...policy,
        updatedAt: sql`now()`,
      },
    })
}
