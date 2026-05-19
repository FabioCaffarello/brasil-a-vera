// Gate de consent à política de privacidade — Wave 10 Etapa 9.3.
//
// RSC server component que envolve `(authenticated)/layout.tsx`.
// Para cada request a uma rota privada, faz lookup do último consent
// `privacy_policy` do usuário e compara com `PRIVACY_POLICY_VERSION`.
// Se desatualizado/ausente, renderiza `<ConsentModal />` no lugar
// dos children — o modal bloqueia interação com o app embaixo.
//
// Custo: 1 query extra por request autenticado (`SELECT ... FROM
// consent_log WHERE user_id = ? AND scope = 'privacy_policy' ORDER
// BY consented_at DESC LIMIT 1`). Coberta pelo índice composto
// `consent_log_user_scope_idx`. ADR-018 não exige cache aqui — o
// custo é proporcional aos hits autenticados (~750 MAU Wave 10),
// não ao tráfego anônimo.
//
// Falha silenciosa: se a query erra (DB down, etc.), assumimos
// `consent ausente` e mostramos o modal. Preferível a deixar passar.

import { auth } from '@clerk/nextjs/server'

import { ConsentModal } from '@/components/painel/consent-gate/consent-modal'
import { isPrivacyConsentCurrent, PRIVACY_POLICY_VERSION } from '@/lib/privacy'
import { getLatestConsentByScope } from '@/lib/queries/consent-log'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

interface Props {
  children: React.ReactNode
}

export async function ConsentGate({ children }: Props) {
  const { userId } = await auth()
  // Sem usuário: middleware bloqueia /painel/* via auth.protect();
  // este caminho não deve disparar, mas se disparar, deixa passar
  // (o redirect do middleware é a defesa real).
  if (!userId) return <>{children}</>

  const internalUserId = await getOrCreateUserProfileId(userId)
  // Profile não pôde ser resolvido (Clerk sem email, race condição):
  // deixa passar — a página /painel exibe estado de erro próprio.
  if (!internalUserId) return <>{children}</>

  let consent: Awaited<ReturnType<typeof getLatestConsentByScope>>
  try {
    consent = await getLatestConsentByScope(internalUserId, 'privacy_policy')
  } catch {
    // Falha de banco: assume ausente, mostra modal.
    consent = undefined
  }

  if (!isPrivacyConsentCurrent(consent)) {
    return <ConsentModal policyVersion={PRIVACY_POLICY_VERSION} />
  }

  return <>{children}</>
}
