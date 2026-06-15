// Slot Configurações do painel (área logada, RSC) — promovido ao RDS (ADR-033).
//
// 4 seções verticais (Perfil / Temas / Comunicação / Privacidade). `auth()`
// (Clerk) + queries (user-profile) preservadas. `FormPerfil`/`TemasChips`/
// `ComunicacaoToggles` importados dos canônicos (client islands — forms).
// Classnames em tokens RDS (text-fg-primary, text-fg-tertiary, hover:text-fg-brand).

import { auth } from '@clerk/nextjs/server'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { ComunicacaoToggles } from '@/components/painel/configuracoes/comunicacao-toggles'
import { FormPerfil } from '@/components/painel/configuracoes/form-perfil'
import { TemasChips } from '@/components/painel/configuracoes/temas-chips'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

export default async function ConfiguracoesSlot() {
  const { userId } = await auth()
  if (!userId) return null

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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          Configurações
        </h1>
        <p className="mt-1 text-fg-tertiary">
          Perfil, temas, comunicação e dados.
        </p>
      </header>

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 font-medium text-fg-primary text-lg">Perfil</h2>
          <FormPerfil
            email={profile.email}
            initialDisplayName={profile.displayName}
            initialUf={profile.uf}
          />
        </section>

        <section>
          <h2 className="mb-1 font-medium text-fg-primary text-lg">
            Temas de interesse
          </h2>
          <p className="mb-3 text-fg-tertiary text-sm">
            Influenciam recomendações e o conteúdo do report semanal.
          </p>
          <TemasChips initialThemes={profile.themes} />
        </section>

        <section>
          <h2 className="mb-1 font-medium text-fg-primary text-lg">
            Comunicação
          </h2>
          <p className="mb-3 text-fg-tertiary text-sm">
            Mensagens fora do serviço regular de alertas. Sempre opt-in.
          </p>
          <ComunicacaoToggles
            initialMarketingOptedIn={profile.marketingOptedIn}
            initialSurveyOptedIn={profile.surveyOptedIn}
          />
        </section>

        <section>
          <h2 className="mb-3 font-medium text-fg-primary text-lg">
            Privacidade
          </h2>
          <ul className="space-y-2">
            <li>
              <Link
                className="inline-flex items-center gap-2 text-fg-primary underline underline-offset-4 hover:text-fg-brand"
                href="/painel?tab=meus-dados"
              >
                Ver, exportar ou apagar meus dados
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </li>
            <li>
              <Link
                className="inline-flex items-center gap-2 text-fg-primary underline underline-offset-4 hover:text-fg-brand"
                href="/privacidade"
              >
                Política de privacidade
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
