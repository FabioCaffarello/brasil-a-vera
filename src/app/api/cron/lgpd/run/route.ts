// POST /api/cron/lgpd/run — Wave 10 Etapa 9.6.
//
// Endpoint disparado pelo cron diário LGPD (GitHub Actions cron via
// curl com header x-cron-secret). Auth via header CRON_SECRET — não
// usa Clerk (caller é máquina).
//
// Dois jobs em sequência (orquestrados em src/lib/lgpd-cron/orchestrator.ts):
//   1. Lembretes pré-hard-delete: usuários com deleted_at entre 25
//      e 29 dias atrás recebem email de reativação.
//      Idempotência via alert_delivery.idempotency_key único
//      (sha256(user_id + 'lgpd_reminder')) — 1 email por usuário,
//      independente de quantas vezes o cron rode na janela.
//   2. Hard delete: usuários com deleted_at >= 30 dias atrás têm
//      user_profile.id removido. Cascade no schema apaga follows,
//      alert_policy, alert_delivery; consent_log preserva via FK
//      ON DELETE SET NULL.
//
// Cadência operacional: cron diário às 12:00 UTC = 9:00 BRT
// (workflow .github/workflows/lgpd-cron.yml).

import { NextResponse } from 'next/server'

import { runLgpdCron } from '@/lib/lgpd-cron/orchestrator'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) {
    console.error('[cron/lgpd] CRON_SECRET não configurado')
    return new NextResponse('Server misconfigured', { status: 500 })
  }
  const providedSecret = req.headers.get('x-cron-secret')
  if (providedSecret !== expectedSecret) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const now = new Date()
  const signInUrl = `${getSiteUrl()}/sign-in`

  try {
    const stats = await runLgpdCron({ now, signInUrl })
    return NextResponse.json({
      ok: true,
      ranAt: now.toISOString(),
      stats,
    })
  } catch (err) {
    console.error('[cron/lgpd] erro fatal:', err)
    return NextResponse.json(
      {
        ok: false,
        ranAt: now.toISOString(),
        error: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    )
  }
}
