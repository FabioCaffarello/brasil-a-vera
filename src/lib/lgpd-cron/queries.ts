// Queries DB do cron LGPD — Wave 10 Etapa 9.6.
//
// `findReminderCandidates`: usuários com `deleted_at` entre 25 e 29
// dias atrás, ainda com email disponível (não anonimizados nem
// hard-deletados).
//
// `findHardDeleteCandidates`: usuários com `deleted_at` >= 30 dias
// atrás. O DELETE em si fica em hard-delete.ts (orquestrador).

import { and, gte, isNotNull, lte } from 'drizzle-orm'

import { userProfile } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export interface ReminderCandidate {
  userId: string
  email: string
  displayName: string | null
  deletedAt: Date
}

/**
 * Candidatos a receber email de lembrete pré-hard-delete.
 *
 * Janela: `deleted_at` entre (now - 29d) e (now - 25d).
 *
 * Não filtra "já recebeu lembrete?" aqui — a idempotência é por
 * `alert_delivery.idempotency_key` único (caller insere; segundo
 * run vira no-op via ON CONFLICT). Reduz superfície da query.
 *
 * Filtros defensivos:
 *   - `deleted_at IS NOT NULL` (redundante mas explícito)
 *   - Em JS pós-query: `email !== ''` (anonimizados têm email='',
 *     não devem receber email).
 */
export async function findReminderCandidates(
  now: Date,
): Promise<ReminderCandidate[]> {
  const windowEnd = subDays(now, 25)
  const windowStart = subDays(now, 29)

  const rows = await db
    .select({
      userId: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.displayName,
      deletedAt: userProfile.deletedAt,
    })
    .from(userProfile)
    .where(
      and(
        isNotNull(userProfile.deletedAt),
        gte(userProfile.deletedAt, windowStart),
        lte(userProfile.deletedAt, windowEnd),
      ),
    )

  return rows
    .filter((r): r is typeof r & { deletedAt: Date } => r.deletedAt !== null)
    .filter((r) => r.email.length > 0)
    .map((r) => ({
      userId: r.userId,
      email: r.email,
      displayName: r.displayName,
      deletedAt: r.deletedAt,
    }))
}

export interface HardDeleteCandidate {
  userId: string
  deletedAt: Date
}

/**
 * Candidatos a hard-delete: `deleted_at` >= 30 dias atrás.
 *
 * Caller (orquestrador) emite DELETE em cada row. Cascade no schema
 * remove follows, alert_policy, alert_delivery; consent_log
 * permanece com user_id = NULL (FK ON DELETE SET NULL).
 */
export async function findHardDeleteCandidates(
  now: Date,
): Promise<HardDeleteCandidate[]> {
  const threshold = subDays(now, 30)

  const rows = await db
    .select({
      userId: userProfile.id,
      deletedAt: userProfile.deletedAt,
    })
    .from(userProfile)
    .where(
      and(
        isNotNull(userProfile.deletedAt),
        lte(userProfile.deletedAt, threshold),
      ),
    )

  return rows
    .filter((r): r is typeof r & { deletedAt: Date } => r.deletedAt !== null)
    .map((r) => ({
      userId: r.userId,
      deletedAt: r.deletedAt,
    }))
}

function subDays(date: Date, days: number): Date {
  const out = new Date(date)
  out.setUTCDate(out.getUTCDate() - days)
  return out
}
