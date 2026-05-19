// POST /api/painel/dados/export — Wave 10 Etapa 9.4.
//
// Portabilidade (LGPD art. 18 V). Cria uma linha em `data_request`
// (status=running), materializa o snapshot do usuário em JSON e
// retorna como download — sem R2 nesta wave; o JSON viaja direto
// no response (`Content-Disposition: attachment`).
//
// Processamento síncrono: ~750 MAU, raras solicitações/mês,
// JSON pequeno (<250 rows). Async via Workers Queue só se métricas
// futuras exigirem (ADR-019).

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { exportUserData } from '@/lib/data-requests/export-user'
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
    kind: 'export',
  })

  try {
    const payload = await exportUserData(internalUserId)
    if (!payload) {
      await markDataRequestFailed(requestId)
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
    }
    await markDataRequestDone(requestId)

    const filename = `brasil-a-vera-export-${new Date().toISOString().slice(0, 10)}.json`
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    await markDataRequestFailed(requestId)
    return NextResponse.json(
      {
        error: 'export_failed',
        detail: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 },
    )
  }
}
