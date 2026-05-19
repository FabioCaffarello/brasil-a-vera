// Layout do `/painel` — Fase 2 do refator pós-Wave 10 (RFC §3 / ADR-032),
// refinado na Fase 3 com PainelHeader (identidade) + TabBar counters.
//
// Combina os 5 slots (Parallel Routes) via `<ActiveSlotPicker />` client
// que troca visibilidade baseado em `useSearchParams().get('tab')`.
// Layouts em Next.js não recebem `searchParams`; ActiveSlotPicker
// fecha o gap server→client (RFC §4 D1).
//
// Fase 3 adicionou:
//   - PainelHeader (RSC) acima do TabBar — kicker "Sua área" + avatar
//     gradient + nome + email · UF
//   - TabBar agora recebe `counters` (follows + unread deliveries)
//   - Layout resolve identity + counters server-side em paralelo aos
//     slots; pequena duplicação de queries com slots (custo aceito,
//     mitigação `cached()` ADR-018 fica como follow-up — RFC §7 R1)
//
// `children` é o conteúdo de `/painel/page.tsx` (neutral; retorna null).
// `generateMetadata` dinâmica baseada em `?tab=` mora em `page.tsx`.

import { auth } from '@clerk/nextjs/server'

import { ActiveSlotPicker } from '@/components/painel/active-slot-picker'
import { PainelHeader } from '@/components/painel/painel-header'
import { TabBar } from '@/components/painel/tab-bar'
import { countUnreadInappDeliveriesByUserId } from '@/lib/queries/alert-delivery'
import { countFollowsByUserId } from '@/lib/queries/follows'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

interface Props {
  children: React.ReactNode
  resumo: React.ReactNode
  parlamentares: React.ReactNode
  alertas: React.ReactNode
  configuracoes: React.ReactNode
  meusDados: React.ReactNode
}

export default async function PainelLayout({
  children,
  resumo,
  parlamentares,
  alertas,
  configuracoes,
  meusDados,
}: Props) {
  // `children` é o page.tsx (neutral, retorna null). Não renderizamos
  // explicitamente — os slots cobrem toda a área de conteúdo.
  void children

  const { userId } = await auth()
  if (!userId) return null // middleware redireciona; type-narrowing.

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    // Estado anormal — slots tratam erro com mensagem própria; layout
    // fica neutro para não duplicar mensagens.
    return (
      <ActiveSlotPicker
        alertas={alertas}
        configuracoes={configuracoes}
        meusDados={meusDados}
        parlamentares={parlamentares}
        resumo={resumo}
      />
    )
  }

  const [profile, followsCount, unreadAlertsCount] = await Promise.all([
    findUserProfileByClerkId(userId),
    countFollowsByUserId(internalUserId),
    countUnreadInappDeliveriesByUserId(internalUserId),
  ])

  return (
    <>
      {profile ? (
        <PainelHeader
          displayName={profile.displayName}
          email={profile.email}
          uf={profile.uf}
        />
      ) : null}
      <TabBar
        counters={{
          parlamentares: followsCount,
          alertas: unreadAlertsCount,
        }}
      />
      <ActiveSlotPicker
        alertas={alertas}
        configuracoes={configuracoes}
        meusDados={meusDados}
        parlamentares={parlamentares}
        resumo={resumo}
      />
    </>
  )
}
