// Cópia-rds de src/app/(authenticated)/painel/layout.tsx — migração painel
// (área logada /rds/painel). Layout de Parallel Routes: recebe os 5 slots
// nomeados como props e os compõe via <ActiveSlotPicker />.
//
// Estrutura @slot recriada 1:1 sob src/app/rds/painel/ (parallel routes
// funcionam aninhados sob o RdsStagingLayout — este layout filho declara e
// renderiza os slots; o /rds/layout.tsx pai só envolve em <div> + noindex.
// Confirmado pelo build: sem incompatibilidade estrutural).
//
// `auth()` (Clerk) PRESERVADO server-side: o ClerkProvider único vem do root
// layout (fix #315). Queries (follows, alert-delivery, user-profile)
// preservadas — importadas das mesmas libs originais (lógica de domínio única,
// não duplicada).
//
// PainelHeader (RSC) traduzido em ./_components; TabBar e ActiveSlotPicker
// (client islands) duplicados em ./_components. `children` é o page.tsx
// (neutral, retorna null).

import { auth } from '@clerk/nextjs/server'

import { countUnreadInappDeliveriesByUserId } from '@/lib/queries/alert-delivery'
import { countFollowsByUserId } from '@/lib/queries/follows'
import {
  findUserProfileByClerkId,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

import { ActiveSlotPicker } from './_components/active-slot-picker'
import { PainelHeader } from './_components/painel-header'
import { TabBar } from './_components/tab-bar'

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
