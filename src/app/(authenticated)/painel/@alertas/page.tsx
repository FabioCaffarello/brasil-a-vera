// Componente do painel (área logada) — promovido ao RDS (ADR-033).
//
// 2 sub-tabs com URL state em `?subtab=` (default `politicas`). `auth()`
// (Clerk) + queries (alert-delivery, alert-policy, user-profile) preservadas.
// `FormPoliticas` importado do ORIGINAL (client island — form completo).
// `SubTabs`/`ListaRecebidos` → cópias locais. `painel-tabs` (parser puro) do
// ORIGINAL (decisão #4).
//
// Tradução de classnames pela tabela canônica:
//   text-foreground       → text-fg-primary
//   text-foreground-muted → text-fg-tertiary

import { auth } from '@clerk/nextjs/server'

import { FormPoliticas } from '@/components/painel/alertas/form-politicas'
import { ListaRecebidos } from '@/components/painel/alertas/lista-recebidos'
import { SubTabsAlertas } from '@/components/painel/alertas/sub-tabs'
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
      <div className="container mx-auto max-w-2xl px-4 py-16 text-fg-tertiary">
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
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          Alertas
        </h1>
        <p className="mt-1 text-fg-tertiary">
          Caixa de reports recebidos e regras de quando você recebe novos.
        </p>
      </header>

      <SubTabsAlertas
        active={activeSubtab}
        recebidosCount={deliveries.length}
      />

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
