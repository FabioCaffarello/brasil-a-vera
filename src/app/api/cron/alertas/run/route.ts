// POST /api/cron/alertas/run — Wave 10 Etapa 7 sub-PR 7.1.
//
// Endpoint disparado pelo cron semanal (Cloudflare Cron Trigger ou
// GitHub Actions cron — escolha de trigger documentada no PR).
// Não usa autenticação Clerk: o caller é máquina, não usuário. Auth
// via header `x-cron-secret` validado contra `CRON_SECRET` env.
//
// Lógica do sub-PR 7.1 (infra):
//   1. Valida secret
//   2. Lista usuários elegíveis (com follows > 0)
//   3. Para cada usuário, computa idempotency_key e cria 1-2
//      deliveries (canal email + inapp, conforme alert_policy)
//   4. **Esta sub-PR cria deliveries com status `pending` + body
//      placeholder.** Sub-PR 7.2 adiciona agregadores reais
//      (substituindo o body). Sub-PR 7.3 envia via Resend
//      (status pending → sent).
//
// Idempotente: rodar duas vezes na mesma janela NÃO duplica deliveries
// (`onConflictDoNothing` no idempotency_key).

import { count, eq, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { computeIdempotencyKey, currentWeeklyPeriod } from '@/lib/cron-period'
import { createDelivery } from '@/lib/queries/alert-delivery'
import {
  alertPolicy,
  follows,
  userProfile,
} from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export const dynamic = 'force-dynamic'

interface RunStats {
  usersProcessed: number
  deliveriesInserted: number
  deliveriesSkipped: number
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
      cadence: alertPolicy.cadence,
      channelEmail: alertPolicy.channelEmail,
      channelInapp: alertPolicy.channelInapp,
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
    )

  const stats: RunStats = {
    usersProcessed: 0,
    deliveriesInserted: 0,
    deliveriesSkipped: 0,
    errors: 0,
  }

  const periodLabel = formatPeriodLabel(period.periodStart, period.periodEnd)

  for (const user of eligible) {
    if (user.followsCount === 0) continue // safety: GROUP BY garante mas defensivo
    stats.usersProcessed += 1

    const channels: ('email' | 'inapp')[] = []
    if (user.channelEmail) channels.push('email')
    if (user.channelInapp) channels.push('inapp')

    for (const channel of channels) {
      try {
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
          subject: `Brasil à Vera · Resumo ${periodLabel}`,
          // Body placeholder — sub-PR 7.2 substitui pelo agregador real.
          bodyMd:
            '# Em construção\n\nO conteúdo agregado do report chega na Wave 10 Etapa 7.2.\n',
          scheduledFor: period.scheduledFor,
          status: 'pending',
        })
        if (result.inserted) stats.deliveriesInserted += 1
        else stats.deliveriesSkipped += 1
      } catch (err) {
        console.error(
          `[cron/alertas] erro processando user=${user.userId} channel=${channel}:`,
          err,
        )
        stats.errors += 1
      }
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
