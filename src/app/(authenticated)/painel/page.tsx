// `/painel` — Wave 10 Etapas 1 e 2.
//
// Etapa 1: validar fluxo de login + lazy upsert do user_profile.
// Etapa 2: mostrar contagem real de parlamentares acompanhados.
//
// Estados completos (KPI strip, recomendações por UF, último report)
// entram na Etapa 3 (LOGGED-AREA-VISION §5.1, 4 estados dinâmicos +
// wizard de onboarding).

import { auth } from '@clerk/nextjs/server'

import { countFollowsByUserId } from '@/lib/queries/follows'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

export default async function PainelPage() {
  const { userId } = await auth()
  if (!userId) {
    // Estado impossível em prod (middleware redireciona antes), mas
    // type-narrowing força o check.
    return null
  }

  const internalUserId = await getOrCreateUserProfileId(userId)
  const profile = internalUserId ? await findUserProfileByClerkId(userId) : null

  const followsCount = internalUserId
    ? await countFollowsByUserId(internalUserId)
    : 0

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-semibold text-3xl text-foreground tracking-tight">
        Em construção
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Olá, {profile?.displayName ?? profile?.email ?? 'cidadão(ã)'}. A área
        logada do Brasil à Vera está sendo construída em fases.
      </p>
      <p className="mt-2 text-base text-muted-foreground">
        Você está acompanhando{' '}
        <span className="font-semibold text-foreground">{followsCount}</span>{' '}
        {followsCount === 1 ? 'parlamentar' : 'parlamentares'}. Próximas etapas
        habilitam alertas semanais consolidados e dashboard LGPD.
      </p>
      <p className="mt-4 text-muted-foreground text-sm">
        Documento de visão:{' '}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/product/LOGGED-AREA-VISION.md"
          rel="noreferrer"
          target="_blank"
        >
          LOGGED-AREA-VISION.md
        </a>
      </p>
    </div>
  )
}
