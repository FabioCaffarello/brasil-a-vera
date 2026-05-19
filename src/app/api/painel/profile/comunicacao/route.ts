// POST /api/painel/profile/comunicacao — Wave 10 Etapa 5 (refinada em 9.2).
//
// Atualiza opt-ins de comunicação E registra cada mudança em
// consent_log (audit trail LGPD — ADR-031). Compara com estado
// anterior; só insere consent_log quando o flag mudou.
//
// Wave 10 Etapa 9.2:
//   - `policy_version` agora referencia `PRIVACY_POLICY_VERSION`
//     (era `comunicacao_v1` hardcoded; consents são sempre
//     contextualizados pela política de privacidade vigente,
//     não por uma "política de comunicação" separada).
//   - `ip_hash` computado de verdade via `hashIpFromRequest` (era
//     string vazia stub).
//
// Body: { marketingOptedIn: boolean, surveyOptedIn: boolean }

import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hashIpFromRequest } from '@/lib/ip-hash'
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy'
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

  // ip_hash é computado uma vez (mesmo timestamp + IP) e reusado nos
  // 2 possíveis consent_log inserts do mesmo request. Hashar duas
  // vezes não muda o resultado, mas evita 2 chamadas a crypto.subtle.
  const ipHash = await hashIpFromRequest(req)

  const consentInserts: Promise<void>[] = []
  if (!previous || previous.marketingOptedIn !== parsed.data.marketingOptedIn) {
    consentInserts.push(
      recordConsent({
        userId: internalUserId,
        scope: 'marketing',
        granted: parsed.data.marketingOptedIn,
        legalBasis: LEGAL_BASIS_CONSENTIMENTO,
        policyVersion: PRIVACY_POLICY_VERSION,
        source: 'painel_configuracoes',
        ipHash,
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
        policyVersion: PRIVACY_POLICY_VERSION,
        source: 'painel_configuracoes',
        ipHash,
      }),
    )
  }
  if (consentInserts.length > 0) {
    await Promise.all(consentInserts)
  }

  return NextResponse.json({ ok: true })
}
