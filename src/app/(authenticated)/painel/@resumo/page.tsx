// Componente do painel (área logada) — promovido ao RDS (ADR-033).
//
// 4 estados dinâmicos preservados (onboarding-wizard / novo / onboarding /
// maduro). Queries (alert-delivery, follows, user-profile) preservadas das
// libs originais. `auth()` (Clerk) preservado server-side.
//
// `OnboardingWizard` (client island — modal full-screen) e
// `EstadoMaduro/Novo/Onboarding` importados dos canônicos (@/components/painel).
//
// Tradução de classnames pela tabela canônica: text-foreground-muted →
// text-fg-tertiary (erro neutro).

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
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-fg-tertiary">
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

  // Estado 4: maduro (limiar por follows)
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
