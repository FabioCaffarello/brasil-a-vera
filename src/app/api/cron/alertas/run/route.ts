// POST /api/cron/alertas/run — Wave 10 Etapa 7 sub-PRs 7.1 + 7.2 + 7.3.
//
// Endpoint disparado pelo cron semanal (GitHub Actions cron via curl
// para este endpoint com header x-cron-secret). Auth via header
// CRON_SECRET — não usa Clerk (caller é máquina).
//
// Sub-PR 7.1 (infra): alert_delivery + idempotency_key sha256 unique.
// Sub-PR 7.2 (agregadores): body_md real + skipped quando vazio.
// Sub-PR 7.3 (envio — esta camada):
//   - Channel `inapp`: marca sent imediato após createDelivery
//     (delivery já efetiva no banco; sub-tab Recebidos renderiza)
//   - Channel `email`: chama Resend com markdown→HTML; sucesso marca
//     sent + delivered_at; erro marca failed (sem retry transparente
//     nesta wave — VISION §6 Workers Queues fica para evidência futura)
//
// Idempotente: rodar duas vezes na mesma janela NÃO duplica deliveries
// (`onConflictDoNothing` no idempotency_key) E NÃO reenvia email
// (Resend só chamado quando `inserted=true` em createDelivery).

import { and, count, eq, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import {
  aggregateForUser,
  isAggregateEmpty,
} from '@/lib/aggregators/alertas-semanais'
import { composeReportMarkdown } from '@/lib/aggregators/compose-markdown'
import { computeIdempotencyKey, currentWeeklyPeriod } from '@/lib/cron-period'
import { renderMarkdown, wrapHtmlForEmail } from '@/lib/markdown'
import {
  createDelivery,
  type DeliveryStatus,
  markDeliveryFailed,
  markDeliverySent,
} from '@/lib/queries/alert-delivery'
import { sendEmail } from '@/lib/resend-client'
import {
  alertPolicy,
  follows,
  userProfile,
} from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export const dynamic = 'force-dynamic'

interface RunStats {
  usersProcessed: number
  deliveriesSent: number
  deliveriesSkipped: number
  deliveriesFailed: number
  deliveriesAlreadyExisted: number
  errors: number
}

export async function POST(req: Request) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) {
    console.error('[cron/alertas] CRON_SECRET não configurado')
    return new NextResponse('Server misconfigured', { status: 500 })
  }
  const providedSecret = req.headers.get('x-cron-secret')
  if (providedSecret !== expectedSecret) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const now = new Date()
  const period = currentWeeklyPeriod(now)

  // Usuários elegíveis: ativos, com policy, com pelo menos 1 follow.
  // Query única com COUNT de follows como filtro.
  const eligible = await db
    .select({
      userId: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.displayName,
      cadence: alertPolicy.cadence,
      channelEmail: alertPolicy.channelEmail,
      channelInapp: alertPolicy.channelInapp,
      topicVotacoes: alertPolicy.topicVotacoes,
      topicGastos: alertPolicy.topicGastos,
      topicProposicoes: alertPolicy.topicProposicoes,
      topicDivergencias: alertPolicy.topicDivergencias,
      followsCount: count(follows.parlamentarId),
    })
    .from(userProfile)
    .innerJoin(alertPolicy, eq(alertPolicy.userId, userProfile.id))
    .innerJoin(follows, eq(follows.userId, userProfile.id))
    .where(isNull(userProfile.deletedAt))
    .groupBy(
      userProfile.id,
      alertPolicy.cadence,
      alertPolicy.channelEmail,
      alertPolicy.channelInapp,
      alertPolicy.topicVotacoes,
      alertPolicy.topicGastos,
      alertPolicy.topicProposicoes,
      alertPolicy.topicDivergencias,
    )

  const stats: RunStats = {
    usersProcessed: 0,
    deliveriesSent: 0,
    deliveriesSkipped: 0,
    deliveriesFailed: 0,
    deliveriesAlreadyExisted: 0,
    errors: 0,
  }

  const periodLabel = formatPeriodLabel(period.periodStart, period.periodEnd)

  for (const user of eligible) {
    if (user.followsCount === 0) continue
    stats.usersProcessed += 1

    const channels: ('email' | 'inapp')[] = []
    if (user.channelEmail) channels.push('email')
    if (user.channelInapp) channels.push('inapp')
    if (channels.length === 0) continue

    try {
      // Agrega UMA VEZ por usuário (não por canal) — conteúdo é o mesmo
      // para email e inapp.
      const aggregate = await aggregateForUser({
        userId: user.userId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        policy: {
          topicVotacoes: user.topicVotacoes,
          topicGastos: user.topicGastos,
          topicProposicoes: user.topicProposicoes,
          topicDivergencias: user.topicDivergencias,
        },
      })

      const empty = isAggregateEmpty(aggregate)

      const status: DeliveryStatus = empty ? 'skipped' : 'pending'
      const subject = empty
        ? `Brasil à Vera · ${periodLabel} (sem novidades)`
        : `Brasil à Vera · Resumo ${periodLabel}`
      const bodyMd = empty
        ? `# Sem novidades em ${periodLabel}\n\nNenhuma atividade relevante dos parlamentares que você acompanha. Este ciclo será agregado no próximo report.\n`
        : composeReportMarkdown(aggregate, {
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            followsCount: user.followsCount,
            displayName: user.displayName,
          })

      // Pre-render HTML uma vez (mesmo conteúdo para todos os canais
      // email do user; channel inapp não usa HTML).
      const htmlBody = empty ? '' : wrapHtmlForEmail(renderMarkdown(bodyMd))

      for (const channel of channels) {
        const idempotencyKey = await computeIdempotencyKey({
          userId: user.userId,
          periodStart: period.periodStart,
          cadence: user.cadence as 'weekly' | 'biweekly' | 'monthly',
          channel,
        })
        const result = await createDelivery({
          userId: user.userId,
          idempotencyKey,
          channel,
          subject,
          bodyMd,
          scheduledFor: period.scheduledFor,
          // Inicia tudo como `pending` (ou `skipped` se vazio); para
          // channels que efetivam imediatamente abaixo (inapp / email
          // OK), promovemos para `sent` na sequência.
          status,
        })

        if (!result.inserted) {
          stats.deliveriesAlreadyExisted += 1
          continue
        }

        if (status === 'skipped') {
          stats.deliveriesSkipped += 1
          continue
        }

        // Aqui: status=pending e a linha foi inserida agora.
        const deliveryId = result.id
        if (!deliveryId) {
          // Defensivo — inserted=true sem id é impossível pelo schema
          // (uuidv7 default), mas mantém type-safety.
          stats.errors += 1
          continue
        }

        if (channel === 'inapp') {
          // Channel inapp: delivery já efetiva no banco. Marca sent
          // imediato com delivered_at = now.
          await markDeliverySent(deliveryId, new Date())
          stats.deliveriesSent += 1
          continue
        }

        // Channel email: chama Resend.
        const emailResult = await sendEmail({
          to: user.email,
          subject,
          html: htmlBody,
          text: bodyMd,
        })

        if (emailResult.ok) {
          await markDeliverySent(deliveryId, new Date())
          stats.deliveriesSent += 1
        } else {
          await markDeliveryFailed(deliveryId)
          stats.deliveriesFailed += 1
          console.error(
            `[cron/alertas] envio falhou user=${user.userId} delivery=${deliveryId}: ${emailResult.error}`,
          )
        }
      }
    } catch (err) {
      console.error(`[cron/alertas] erro processando user=${user.userId}:`, err)
      stats.errors += 1
    }
  }

  return NextResponse.json({
    ok: true,
    period: {
      start: period.periodStart.toISOString(),
      end: period.periodEnd.toISOString(),
      scheduledFor: period.scheduledFor.toISOString(),
    },
    stats,
  })
}

function formatPeriodLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return `${fmt(start)}–${fmt(end)}`
}

// Suprime warning de import não-usado em `and` (mantido para futuro
// uso quando filtros adicionais entrarem — orientacao_bancada
// LIBERADO, etc.).
void and
