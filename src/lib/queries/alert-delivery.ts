// Queries para `usuario.alert_delivery` — Wave 10 Etapa 7.
//
// Inbox de reports semanais (channel=inapp) + auditoria de envio
// (channel=email). Inserções via cron são idempotentes pelo
// `idempotency_key` unique.

import { and, desc, eq, sql } from 'drizzle-orm'

import { alertDelivery } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface CreateDeliveryInput {
  userId: string
  idempotencyKey: string
  channel: 'email' | 'inapp'
  subject: string
  bodyMd: string
  scheduledFor: Date
  status: DeliveryStatus
}

export interface CreateDeliveryResult {
  /** `true` se a linha foi inserida; `false` se já existia (idempotency). */
  inserted: boolean
}

/**
 * Insere uma delivery se ainda não houver uma com a mesma
 * `idempotency_key`. Retorna `{ inserted: false }` quando o key já
 * existe (cron rodando duas vezes na mesma janela; não erro).
 */
export async function createDelivery(
  input: CreateDeliveryInput,
): Promise<CreateDeliveryResult> {
  const result = await db
    .insert(alertDelivery)
    .values({
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      channel: input.channel,
      subject: input.subject,
      bodyMd: input.bodyMd,
      scheduledFor: input.scheduledFor,
      status: input.status,
    })
    .onConflictDoNothing({ target: alertDelivery.idempotencyKey })
    .returning({ id: alertDelivery.id })
  return { inserted: result.length > 0 }
}

export async function markDeliverySent(
  deliveryId: string,
  deliveredAt: Date,
): Promise<void> {
  await db
    .update(alertDelivery)
    .set({ status: 'sent', deliveredAt })
    .where(eq(alertDelivery.id, deliveryId))
}

export async function markDeliveryFailed(deliveryId: string): Promise<void> {
  await db
    .update(alertDelivery)
    .set({ status: 'failed' })
    .where(eq(alertDelivery.id, deliveryId))
}

/**
 * Lista deliveries `channel=inapp` para a inbox (Etapa 7 sub-tab
 * Recebidos). Ordenado por `scheduled_for DESC`. Use `limit` para
 * paginação simples (Etapa 7 não tem cursor — volume é baixo, 1
 * delivery por semana por usuário).
 */
export async function listInappDeliveriesByUserId(userId: string, limit = 12) {
  return db
    .select()
    .from(alertDelivery)
    .where(
      and(eq(alertDelivery.userId, userId), eq(alertDelivery.channel, 'inapp')),
    )
    .orderBy(desc(alertDelivery.scheduledFor))
    .limit(limit)
}

export async function markDeliveryRead(
  deliveryId: string,
  userId: string,
): Promise<void> {
  // user_id no WHERE garante que só o dono marca como lida (defense
  // in depth contra IDOR).
  await db
    .update(alertDelivery)
    .set({ readAt: sql`COALESCE(${alertDelivery.readAt}, now())` })
    .where(
      and(eq(alertDelivery.id, deliveryId), eq(alertDelivery.userId, userId)),
    )
}
