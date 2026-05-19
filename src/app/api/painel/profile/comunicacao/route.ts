// POST /api/painel/profile/comunicacao — Wave 10 Etapa 5.
//
// Atualiza opt-ins de comunicação E registra cada mudança em
// consent_log (audit trail LGPD — ADR-031). Compara com estado
// anterior; só insere consent_log quando o flag mudou.
//
// Body: { marketingOptedIn: boolean, surveyOptedIn: boolean }

import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordConsent } from '@/lib/queries/consent-log'
import {
  getOrCreateUserProfileId,
  updateUserProfileComunicacao,
} from '@/lib/queries/user-profile'
import { userProfile } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  marketingOptedIn: z.boolean(),
  surveyOptedIn: z.boolean(),
})

// Versão da política de comunicação. Bump quando o texto mudar.
const COMUNICACAO_POLICY_VERSION = 'comunicacao_v1'
// LGPD art. 7º I — consentimento (opt-in livre, podendo ser revogado).
const LEGAL_BASIS_CONSENTIMENTO = 'art_7_I'

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

  // Lê estado anterior para detectar diffs (audit trail só registra
  // mudanças efetivas; toggle/untoggle no mesmo request não polui o log).
  const [previous] = await db
    .select({
      marketingOptedIn: userProfile.marketingOptedIn,
      surveyOptedIn: userProfile.surveyOptedIn,
    })
    .from(userProfile)
    .where(eq(userProfile.id, internalUserId))
    .limit(1)

  await updateUserProfileComunicacao(internalUserId, parsed.data)

  const consentInserts: Promise<void>[] = []
  if (!previous || previous.marketingOptedIn !== parsed.data.marketingOptedIn) {
    consentInserts.push(
      recordConsent({
        userId: internalUserId,
        scope: 'marketing',
        granted: parsed.data.marketingOptedIn,
        legalBasis: LEGAL_BASIS_CONSENTIMENTO,
        policyVersion: COMUNICACAO_POLICY_VERSION,
        source: 'painel_configuracoes',
      }),
    )
  }
  if (!previous || previous.surveyOptedIn !== parsed.data.surveyOptedIn) {
    consentInserts.push(
      recordConsent({
        userId: internalUserId,
        scope: 'survey',
        granted: parsed.data.surveyOptedIn,
        legalBasis: LEGAL_BASIS_CONSENTIMENTO,
        policyVersion: COMUNICACAO_POLICY_VERSION,
        source: 'painel_configuracoes',
      }),
    )
  }
  if (consentInserts.length > 0) {
    await Promise.all(consentInserts)
  }

  return NextResponse.json({ ok: true })
}
