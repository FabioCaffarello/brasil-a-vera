// `/painel?tab=resumo` slot Resumo — Wave 10 Etapa 3, movido para slot
// na Fase 2 do refator, KPIs reskinned na Fase 3 (RFC §5).
//
// 4 estados dinâmicos (LOGGED-AREA-VISION §5.1):
//   - onboarding-wizard: `onboarded_at IS NULL` → renderiza modal full-screen
//   - novo: `onboarded_at IS NOT NULL` E `count(follows) = 0`
//   - onboarding: `onboarded_at IS NOT NULL` E `1 ≤ count(follows) ≤ 4` E
//                 sem `alert_delivery` recebida
//   - maduro: `count(follows) ≥ 5` OU `count(alert_delivery delivered) ≥ 1`
//
// Fase 3 adiciona 3 queries para os KPIs dos estados maduro/onboarding:
// totalDeliveries, unreadDeliveries, avgAlinhamento. Cost aceito em §7 R1
// (mitigação via cached() ADR-018 fica como follow-up).

import { auth } from '@clerk/nextjs/server'

import { EstadoMaduro } from '@/components/painel/estado-maduro'
import { EstadoNovo } from '@/components/painel/estado-novo'
import { EstadoOnboarding } from '@/components/painel/estado-onboarding'
import { OnboardingWizard } from '@/components/painel/onboarding-wizard'
import {
  countInappDeliveriesByUserId,
  countUnreadInappDeliveriesByUserId,
} from '@/lib/queries/alert-delivery'
import {
  countFollowsByUserId,
  getAvgAlinhamentoForFollows,
  getFollowsByUserId,
} from '@/lib/queries/follows'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const MATURE_FOLLOWS_THRESHOLD = 5

export default async function ResumoSlot() {
  const { userId } = await auth()
  if (!userId) return null // middleware redireciona; type-narrowing.

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    // Estado anormal: Clerk session sem email primário. Renderiza
    // erro neutro em vez de quebrar o middleware ou logar o usuário fora.
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-foreground-muted">
        Não conseguimos carregar seu perfil. Tente atualizar a página em alguns
        segundos.
      </div>
    )
  }

  const profile = await findUserProfileByClerkId(userId)
  if (!profile) return null

  // Estado 1: onboarding-wizard
  if (profile.onboardedAt === null) {
    return <OnboardingWizard />
  }

  const [
    followsCount,
    followedIds,
    totalDeliveries,
    unreadDeliveries,
    avgAlinhamento,
  ] = await Promise.all([
    countFollowsByUserId(internalUserId),
    getFollowsByUserId(internalUserId),
    countInappDeliveriesByUserId(internalUserId),
    countUnreadInappDeliveriesByUserId(internalUserId),
    getAvgAlinhamentoForFollows(internalUserId),
  ])

  // Estado 2: novo (0 follows — sem KPIs, hero CTA)
  if (followsCount === 0) {
    return <EstadoNovo isAnonymous={false} uf={profile.uf} />
  }

  // Estado 4: maduro (limiar por follows; alert_delivery via aggregator
  // virá em fase posterior)
  if (followsCount >= MATURE_FOLLOWS_THRESHOLD) {
    return (
      <EstadoMaduro
        avgAlinhamento={avgAlinhamento}
        displayName={profile.displayName}
        followedIds={followedIds}
        followsCount={followsCount}
        profileCreatedAt={profile.createdAt}
        totalDeliveries={totalDeliveries}
        uf={profile.uf}
        unreadDeliveries={unreadDeliveries}
      />
    )
  }

  // Estado 3: onboarding (1-4 follows)
  return (
    <EstadoOnboarding
      avgAlinhamento={avgAlinhamento}
      followedIds={followedIds}
      followsCount={followsCount}
      profileCreatedAt={profile.createdAt}
      totalDeliveries={totalDeliveries}
      uf={profile.uf}
    />
  )
}
