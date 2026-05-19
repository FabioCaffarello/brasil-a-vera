// `/painel/alertas` — Wave 10 Etapa 6.
//
// 2 sub-tabs com URL state em `?tab=`:
//   - recebidos: inbox de alert_delivery (stub até Etapa 7)
//   - politicas: form completo de gerenciamento da alert_policy
//
// Default tab: politicas (recebidos é stub; políticas é a feature útil
// dessa etapa).

import { auth } from '@clerk/nextjs/server'

import { FormPoliticas } from '@/components/painel/alertas/form-politicas'
import { ListaRecebidos } from '@/components/painel/alertas/lista-recebidos'
import { SubTabs, type TabKey } from '@/components/painel/alertas/sub-tabs'
import { getAlertPolicyOrDefaults } from '@/lib/queries/alert-policy'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Alertas — Brasil à Vera',
}

function normalizeTab(value: string | undefined): TabKey | undefined {
  if (value === 'recebidos' || value === 'politicas') return value
  return undefined
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function PainelAlertasPage({ searchParams }: PageProps) {
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

  const params = await searchParams
  // Default `politicas` — recebidos é stub até Etapa 7; políticas é a
  // feature ativa desta etapa.
  const activeTab = normalizeTab(params.tab) ?? 'politicas'

  const policy = await getAlertPolicyOrDefaults(internalUserId)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          Alertas
        </h1>
        <p className="mt-1 text-foreground-muted">
          Caixa de reports recebidos e regras de quando você recebe novos.
        </p>
      </header>

      <SubTabs active={activeTab} recebidosCount={null} />

      <div className="mt-6">
        {activeTab === 'recebidos' ? (
          <ListaRecebidos />
        ) : (
          <FormPoliticas initial={policy} />
        )}
      </div>
    </div>
  )
}
