// `/painel?tab=alertas` slot — Wave 10 Etapa 6 + 7.4, movido para slot
// na Fase 2 do refator pós-Wave 10 (RFC §3, §6).
//
// 2 sub-tabs com URL state em `?subtab=` (renomeado de `?tab=` da Wave 10):
//   - recebidos: inbox de alert_delivery (channel=inapp)
//   - politicas: form completo de gerenciamento da alert_policy
//
// Default: `politicas` (preserva default da Wave 10 — form útil pra setup).

import { auth } from '@clerk/nextjs/server'

import { FormPoliticas } from '@/components/painel/alertas/form-politicas'
import { ListaRecebidos } from '@/components/painel/alertas/lista-recebidos'
import { SubTabs } from '@/components/painel/alertas/sub-tabs'
import { parseAlertasSubtab } from '@/lib/painel-tabs'
import { listInappDeliveriesByUserId } from '@/lib/queries/alert-delivery'
import { getAlertPolicyOrDefaults } from '@/lib/queries/alert-policy'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ subtab?: string | string[] }>
}

export default async function AlertasSlot({ searchParams }: PageProps) {
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
  const activeSubtab = parseAlertasSubtab(params.subtab) ?? 'politicas'

  const [policy, deliveries] = await Promise.all([
    getAlertPolicyOrDefaults(internalUserId),
    listInappDeliveriesByUserId(internalUserId, 12),
  ])

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

      <SubTabs active={activeSubtab} recebidosCount={deliveries.length} />

      <div className="mt-6">
        {activeSubtab === 'recebidos' ? (
          <ListaRecebidos
            deliveries={deliveries.map((d) => ({
              id: d.id,
              subject: d.subject,
              bodyMd: d.bodyMd,
              scheduledFor: d.scheduledFor,
              readAt: d.readAt,
            }))}
          />
        ) : (
          <FormPoliticas initial={policy} />
        )}
      </div>
    </div>
  )
}
