// `/painel?tab=configuracoes` slot — Wave 10 Etapa 5, movido para slot
// na Fase 2 do refator pós-Wave 10 (RFC §3, §6).
//
// 4 seções verticais (LOGGED-AREA-VISION §5.4):
//   - Perfil (Nome, E-mail read-only, UF)
//   - Temas de interesse (8 chips)
//   - Comunicação (2 opt-ins separados de alertas de serviço)
//   - Privacidade (link interno para a tab Meus dados + link público)
//
// Link "Ver, exportar ou apagar meus dados" atualizado para
// `/painel?tab=meus-dados` (Meus Dados promovida a tab principal — RFC §6).

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
      <div className="container mx-auto max-w-2xl px-4 py-16 text-foreground-muted">
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
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          Configurações
        </h1>
        <p className="mt-1 text-foreground-muted">
          Perfil, temas, comunicação e dados.
        </p>
      </header>

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 font-medium text-foreground text-lg">Perfil</h2>
          <FormPerfil
            email={profile.email}
            initialDisplayName={profile.displayName}
            initialUf={profile.uf}
          />
        </section>

        <section>
          <h2 className="mb-1 font-medium text-foreground text-lg">
            Temas de interesse
          </h2>
          <p className="mb-3 text-foreground-muted text-sm">
            Influenciam recomendações e o conteúdo do report semanal.
          </p>
          <TemasChips initialThemes={profile.themes} />
        </section>

        <section>
          <h2 className="mb-1 font-medium text-foreground text-lg">
            Comunicação
          </h2>
          <p className="mb-3 text-foreground-muted text-sm">
            Mensagens fora do serviço regular de alertas. Sempre opt-in.
          </p>
          <ComunicacaoToggles
            initialMarketingOptedIn={profile.marketingOptedIn}
            initialSurveyOptedIn={profile.surveyOptedIn}
          />
        </section>

        <section>
          <h2 className="mb-3 font-medium text-foreground text-lg">
            Privacidade
          </h2>
          <ul className="space-y-2">
            <li>
              <Link
                className="inline-flex items-center gap-2 text-foreground underline underline-offset-4 hover:text-brand"
                href="/painel?tab=meus-dados"
              >
                Ver, exportar ou apagar meus dados
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </li>
            <li>
              <Link
                className="inline-flex items-center gap-2 text-foreground underline underline-offset-4 hover:text-brand"
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
