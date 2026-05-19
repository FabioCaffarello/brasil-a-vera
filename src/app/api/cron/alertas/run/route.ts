// POST /api/cron/alertas/run — Wave 10 Etapa 7 sub-PRs 7.1 + 7.2.
//
// Endpoint disparado pelo cron semanal (GitHub Actions cron via curl
// para este endpoint com header x-cron-secret). Auth via header
// CRON_SECRET — não usa Clerk (caller é máquina).
//
// Sub-PR 7.1 (infra):
//   - alert_delivery + idempotency_key sha256 unique
//   - body placeholder + status pending
//
// Sub-PR 7.2 (agregadores — esta camada):
//   - Para cada usuário+canal, agrega votações/divergências/proposições/
//     gastos do período (apenas topics ligados na alert_policy do user)
//   - Se Aggregate vazio: status=skipped (LOGGED-AREA-VISION §6 — "sem
//     novidades, sem envio"). Próximo ciclo agrega período pulado.
//   - Se não-vazio: status=pending + body_md gerado pelo composer
//
// Sub-PR 7.3 (próximo): substitui pending→sent via Resend.
// Idempotente: rodar duas vezes na mesma janela NÃO duplica
// deliveries (`onConflictDoNothing` no idempotency_key).

import { and, count, eq, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import {
  aggregateForUser,
  isAggregateEmpty,
} from '@/lib/aggregators/alertas-semanais'
import { composeReportMarkdown } from '@/lib/aggregators/compose-markdown'
import { computeIdempotencyKey, currentWeeklyPeriod } from '@/lib/cron-period'
import {
  createDelivery,
  type DeliveryStatus,
} from '@/lib/queries/alert-delivery'
import {
  alertPolicy,
  follows,
  userProfile,
} from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export const dynamic = 'force-dynamic'

interface RunStats {
  usersProcessed: number
  deliveriesPending: number
  deliveriesSkipped: number
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
    deliveriesPending: 0,
    deliveriesSkipped: 0,
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
          status,
        })
        if (!result.inserted) {
          stats.deliveriesAlreadyExisted += 1
        } else if (status === 'skipped') {
          stats.deliveriesSkipped += 1
        } else {
          stats.deliveriesPending += 1
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
