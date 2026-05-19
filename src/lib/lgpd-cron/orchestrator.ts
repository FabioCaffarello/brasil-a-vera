// Orquestrador do cron LGPD diário — Wave 10 Etapa 9.6.
//
// Dois trabalhos em sequência:
//   1. Lembretes: para cada candidato (deleted_at 25-29 dias atrás),
//      compõe email + tenta enviar via Resend. Idempotência via
//      `alert_delivery.idempotency_key` único — segundo run no
//      mesmo período é no-op.
//   2. Hard delete: para cada candidato (deleted_at >= 30 dias atrás),
//      emite DELETE. Cascade remove follows/alert_policy/alert_delivery;
//      consent_log preserva via FK SET NULL.
//
// Ordem importa: lembretes primeiro garante que ninguém é
// hard-deletado sem receber lembrete por bug de janela (ex.: cron
// não rodou em algum dia, usuário pulou de 24d direto pra 30d).

import { eq } from 'drizzle-orm'

import { buildReminderEmail } from '@/lib/lgpd-cron/compose-reminder'
import {
  findHardDeleteCandidates,
  findReminderCandidates,
  type HardDeleteCandidate,
  type ReminderCandidate,
} from '@/lib/lgpd-cron/queries'
import { renderMarkdown, wrapHtmlForEmail } from '@/lib/markdown'
import {
  createDelivery,
  markDeliveryFailed,
  markDeliverySent,
} from '@/lib/queries/alert-delivery'
import { sendEmail } from '@/lib/resend-client'
import { userProfile } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export interface LgpdCronStats {
  remindersFound: number
  remindersSent: number
  remindersFailed: number
  remindersAlreadySent: number
  hardDeleteFound: number
  hardDeleted: number
  errors: number
}

export interface RunLgpdCronInput {
  now: Date
  signInUrl: string
}

export async function runLgpdCron(
  input: RunLgpdCronInput,
): Promise<LgpdCronStats> {
  const stats: LgpdCronStats = {
    remindersFound: 0,
    remindersSent: 0,
    remindersFailed: 0,
    remindersAlreadySent: 0,
    hardDeleteFound: 0,
    hardDeleted: 0,
    errors: 0,
  }

  // --- Job 1: Lembretes ---
  const reminderCandidates = await findReminderCandidates(input.now)
  stats.remindersFound = reminderCandidates.length

  for (const candidate of reminderCandidates) {
    try {
      const sent = await processReminder({
        candidate,
        now: input.now,
        signInUrl: input.signInUrl,
      })
      if (sent === 'sent') stats.remindersSent += 1
      else if (sent === 'failed') stats.remindersFailed += 1
      else stats.remindersAlreadySent += 1
    } catch (err) {
      console.error(
        `[lgpd-cron] erro processando lembrete user=${candidate.userId}:`,
        err,
      )
      stats.errors += 1
    }
  }

  // --- Job 2: Hard delete ---
  const hardDeleteCandidates = await findHardDeleteCandidates(input.now)
  stats.hardDeleteFound = hardDeleteCandidates.length

  for (const candidate of hardDeleteCandidates) {
    try {
      await hardDeleteUser(candidate)
      stats.hardDeleted += 1
    } catch (err) {
      console.error(
        `[lgpd-cron] erro hard-deleting user=${candidate.userId}:`,
        err,
      )
      stats.errors += 1
    }
  }

  return stats
}

type ReminderResult = 'sent' | 'failed' | 'already_sent'

async function processReminder(input: {
  candidate: ReminderCandidate
  now: Date
  signInUrl: string
}): Promise<ReminderResult> {
  const { candidate, now, signInUrl } = input

  const hardDeleteAt = new Date(candidate.deletedAt)
  hardDeleteAt.setUTCDate(hardDeleteAt.getUTCDate() + 30)

  const email = buildReminderEmail({
    email: candidate.email,
    displayName: candidate.displayName,
    deletedAt: candidate.deletedAt,
    hardDeleteAt,
    now,
    signInUrl,
  })

  // Idempotency: 1 lembrete por usuário, NÃO por dia da janela.
  // Sha256(user_id + 'lgpd_reminder') é estável durante toda a
  // janela 25-29d, garantindo no-op em runs subsequentes do cron
  // sobre o mesmo usuário.
  const idempotencyKey = await sha256Hex(`${candidate.userId}|lgpd_reminder`)

  // scheduledFor: usamos `now` (cron diário não tem "período"
  // delimitado como o semanal). O timestamp distingue runs caso o
  // idempotency key não fosse único.
  const createResult = await createDelivery({
    userId: candidate.userId,
    idempotencyKey,
    channel: 'email',
    subject: email.subject,
    bodyMd: email.bodyMd,
    scheduledFor: now,
    status: 'pending',
  })

  if (!createResult.inserted || !createResult.id) {
    return 'already_sent'
  }

  const htmlBody = wrapHtmlForEmail(renderMarkdown(email.bodyMd))
  const sendResult = await sendEmail({
    to: candidate.email,
    subject: email.subject,
    html: htmlBody,
    text: email.bodyMd,
  })

  if (sendResult.ok) {
    await markDeliverySent(createResult.id, new Date())
    return 'sent'
  }
  await markDeliveryFailed(createResult.id)
  console.error(
    `[lgpd-cron] Resend falhou user=${candidate.userId} delivery=${createResult.id}: ${sendResult.error}`,
  )
  return 'failed'
}

async function hardDeleteUser(candidate: HardDeleteCandidate): Promise<void> {
  await db.delete(userProfile).where(eq(userProfile.id, candidate.userId))
}

async function sha256Hex(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
