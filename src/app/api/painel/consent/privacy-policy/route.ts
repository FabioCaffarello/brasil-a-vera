// POST /api/painel/consent/privacy-policy — Wave 10 Etapa 9.3.
//
// Registra aceite da versão corrente da política de privacidade
// (escopo `privacy_policy`). Disparado pelo `<ConsentGate />` quando
// o usuário clica "Aceitar" no modal.
//
// Sem body: o que o usuário aceita é definido pelo servidor
// (PRIVACY_POLICY_VERSION) — o client não escolhe versão.
//
// Não é idempotente por design: cada clique em "Aceitar" é uma
// manifestação de vontade distinta. Múltiplos cliques produzem
// múltiplas linhas no consent_log — todas com a mesma policy_version,
// o que é audit-honest (cidadão aceitou N vezes a mesma política).
// Custo de banco negligible.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { hashIpFromRequest } from '@/lib/ip-hash'
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy'
import { recordConsent } from '@/lib/queries/consent-log'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

// LGPD art. 7º I — consentimento. Mesma base do opt-in de
// marketing/survey; o aceite da política é a manifestação genuína
// do titular sobre o tratamento dos seus dados.
const LEGAL_BASIS_CONSENTIMENTO = 'art_7_I'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return NextResponse.json({ error: 'profile_unavailable' }, { status: 500 })
  }

  const ipHash = await hashIpFromRequest(req)

  await recordConsent({
    userId: internalUserId,
    scope: 'privacy_policy',
    granted: true,
    legalBasis: LEGAL_BASIS_CONSENTIMENTO,
    policyVersion: PRIVACY_POLICY_VERSION,
    source: 'consent_gate',
    ipHash,
  })

  return NextResponse.json({ ok: true })
}
