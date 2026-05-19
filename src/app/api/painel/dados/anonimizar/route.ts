// POST /api/painel/dados/anonimizar — Wave 10 Etapa 9.4.
//
// Anonimização irreversível (LGPD art. 16, art. 18 IV). Limpa PII
// do user_profile imediatamente, preservando esqueleto histórico
// + consent_log para fins de auditoria não identificável.
//
// Resposta inclui `signOut: true` — anonimização desconecta a
// identidade Clerk; usuário precisa sair.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { anonymizeUser } from '@/lib/data-requests/anonymize-user'
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
    kind: 'anonymize',
  })

  try {
    await anonymizeUser(internalUserId)
    await markDataRequestDone(requestId)
    return NextResponse.json({ ok: true, signOut: true })
  } catch (error) {
    await markDataRequestFailed(requestId)
    return NextResponse.json(
      {
        error: 'anonymize_failed',
        detail: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 },
    )
  }
}
