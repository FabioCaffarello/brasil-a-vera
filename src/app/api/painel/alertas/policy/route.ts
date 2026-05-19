// POST /api/painel/alertas/policy — Wave 10 Etapa 6.
//
// Replace inteiro da alert_policy do usuário (form Políticas envia
// estado completo). Upsert idempotente: INSERT ON CONFLICT DO UPDATE
// cobre tanto primeira gravação quanto edição.
//
// Body: AlertPolicyFields completo (cadence + 2 canais + 5 topics +
// 3 boosts). Validação Zod estrita.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { upsertAlertPolicy } from '@/lib/queries/alert-policy'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  cadence: z.enum(['weekly', 'biweekly', 'monthly']),
  channelEmail: z.boolean(),
  channelInapp: z.boolean(),
  topicVotacoes: z.boolean(),
  topicGastos: z.boolean(),
  topicProposicoes: z.boolean(),
  topicDiscursos: z.boolean(),
  topicDivergencias: z.boolean(),
  boostEleicoes: z.boolean(),
  boostCpis: z.boolean(),
  boostProposicoesMarcadas: z.boolean(),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', detail: parsed.error.message },
      { status: 400 },
    )
  }

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return NextResponse.json({ error: 'profile_unavailable' }, { status: 500 })
  }

  await upsertAlertPolicy(internalUserId, parsed.data)
  return NextResponse.json({ ok: true })
}
