// Export LGPD do titular (portabilidade) — Wave 10 Etapa 9.4.
//
// Camada DB-bound do export. Materializa snapshot de todas as
// tabelas do bounded context Usuário para o titular, devolvendo
// um payload JSON-serializable estável (formato em `buildExportPayload`).

import { asc, eq } from 'drizzle-orm'

import {
  buildExportPayload,
  type ExportPayload,
} from '@/lib/data-requests/export-payload'
import {
  alertDelivery,
  alertPolicy,
  consentLog,
  follows,
  userProfile,
} from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export async function exportUserData(
  internalUserId: string,
  now: Date = new Date(),
): Promise<ExportPayload | null> {
  const [user] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.id, internalUserId))
    .limit(1)
  if (!user) return null

  const [followsRows, alertPolicyRows, alertDeliveriesRows, consentLogRows] =
    await Promise.all([
      db
        .select()
        .from(follows)
        .where(eq(follows.userId, internalUserId))
        .orderBy(asc(follows.followedAt)),
      db
        .select()
        .from(alertPolicy)
        .where(eq(alertPolicy.userId, internalUserId))
        .limit(1),
      db
        .select()
        .from(alertDelivery)
        .where(eq(alertDelivery.userId, internalUserId))
        .orderBy(asc(alertDelivery.scheduledFor)),
      db
        .select()
        .from(consentLog)
        .where(eq(consentLog.userId, internalUserId))
        .orderBy(asc(consentLog.consentedAt)),
    ])

  return buildExportPayload({
    exportedAt: now,
    user,
    follows: followsRows,
    alertPolicy: alertPolicyRows[0] ?? null,
    alertDeliveries: alertDeliveriesRows,
    consentLog: consentLogRows,
  })
}
