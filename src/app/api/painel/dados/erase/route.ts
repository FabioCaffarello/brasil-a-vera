// POST /api/painel/dados/erase — Wave 10 Etapa 9.4.
//
// Eliminação reversível (LGPD art. 18 VI). Soft delete:
// `user_profile.deleted_at = now()`. Hard delete em 30 dias pelo
// cron da Etapa 9.6.
//
// Resposta inclui `signOut: true` para o client encerrar a sessão
// Clerk após sucesso — usuário não deve continuar autenticado em
// conta eliminada.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { eraseUser } from '@/lib/data-requests/erase-user'
import {
  createDataRequest,
  markDataRequestDone,
  markDataRequestFailed,
} from '@/lib/queries/data-request'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return NextResponse.json({ error: 'profile_unavailable' }, { status: 500 })
  }

  const requestId = await createDataRequest({
    userId: internalUserId,
    kind: 'erase',
  })

  try {
    await eraseUser(internalUserId)
    await markDataRequestDone(requestId)
    return NextResponse.json({ ok: true, signOut: true })
  } catch (error) {
    await markDataRequestFailed(requestId)
    return NextResponse.json(
      {
        error: 'erase_failed',
        detail: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 },
    )
  }
}
