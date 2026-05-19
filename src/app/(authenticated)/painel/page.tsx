// `/painel` Resumo — Wave 10 Etapa 3.
//
// 4 estados dinâmicos (LOGGED-AREA-VISION §5.1):
//   - onboarding-wizard: `onboarded_at IS NULL` → renderiza modal full-screen
//   - novo: `onboarded_at IS NOT NULL` E `count(follows) = 0`
//   - onboarding: `onboarded_at IS NOT NULL` E `1 ≤ count(follows) ≤ 4` E
//                 sem `alert_delivery` recebida
//   - maduro: `count(follows) ≥ 5` OU `count(alert_delivery delivered) ≥ 1`
//
// Etapa 3 não inclui alert_delivery (Etapa 7) — então a condição de
// "maduro por delivery" sempre será false aqui; `maduro` só dispara
// quando `count(follows) ≥ 5`. Lógica fica preparada para Etapa 7
// destravar a segunda via.

import { auth } from '@clerk/nextjs/server'

import { EstadoMaduro } from '@/components/painel/estado-maduro'
import { EstadoNovo } from '@/components/painel/estado-novo'
import { EstadoOnboarding } from '@/components/painel/estado-onboarding'
import { OnboardingWizard } from '@/components/painel/onboarding-wizard'
import { countFollowsByUserId, getFollowsByUserId } from '@/lib/queries/follows'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const MATURE_FOLLOWS_THRESHOLD = 5

export default async function PainelPage() {
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

  const [followsCount, followedIds] = await Promise.all([
    countFollowsByUserId(internalUserId),
    getFollowsByUserId(internalUserId),
  ])

  // Estado 2: novo
  if (followsCount === 0) {
    return <EstadoNovo isAnonymous={false} uf={profile.uf} />
  }

  // Estado 4: maduro (limiar por follows; alert_delivery vem na Etapa 7)
  if (followsCount >= MATURE_FOLLOWS_THRESHOLD) {
    return (
      <EstadoMaduro
        displayName={profile.displayName}
        followedIds={followedIds}
        followsCount={followsCount}
        uf={profile.uf}
      />
    )
  }

  // Estado 3: onboarding (1-4 follows)
  return (
    <EstadoOnboarding
      followedIds={followedIds}
      followsCount={followsCount}
      uf={profile.uf}
    />
  )
}
