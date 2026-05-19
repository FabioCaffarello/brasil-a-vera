// POST /api/painel/alertas/recebidos/[id]/read — Wave 10 Etapa 7.4.
//
// Marca uma delivery (channel=inapp) como lida (`read_at = now()`).
// Disparado pelo `<ItemRecebido />` quando o usuário expande o item.
//
// Idempotente: chamar de novo é no-op (COALESCE preserva read_at
// original). Caller pode chamar otimisticamente sem preocupar com
// double-fire por race.
//
// Defesa em profundidade contra IDOR: query usa user_id na WHERE
// (ver markDeliveryRead), então uma delivery de outro usuário NUNCA é
// marcada mesmo que o id seja conhecido.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { markDeliveryRead } from '@/lib/queries/alert-delivery'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const parsed = paramsSchema.safeParse(await params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return NextResponse.json({ error: 'profile_unavailable' }, { status: 500 })
  }

  await markDeliveryRead(parsed.data.id, internalUserId)
  return NextResponse.json({ ok: true })
}
