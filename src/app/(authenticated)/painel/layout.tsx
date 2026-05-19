// Layout do `/painel` — Fase 2 do refator pós-Wave 10 (RFC §3 / ADR-032).
//
// Combina os 5 slots (Parallel Routes) via `<ActiveSlotPicker />` client
// que troca visibilidade baseado em `useSearchParams().get('tab')`.
// Layouts em Next.js não recebem `searchParams`; ActiveSlotPicker
// fecha o gap server→client (RFC §4 D1).
//
// `children` é o conteúdo de `/painel/page.tsx` (neutral; retorna null).
// Slots `@resumo`, `@parlamentares`, `@alertas`, `@configuracoes`,
// `@meusDados` rodam server-side em paralelo. Custo aceito em §4 D9.
//
// `generateMetadata` dinâmica baseada em `?tab=` mora em `page.tsx`
// (layout não tem acesso a searchParams).

import { ActiveSlotPicker } from '@/components/painel/active-slot-picker'
import { TabBar } from '@/components/painel/tab-bar'

interface Props {
  children: React.ReactNode
  resumo: React.ReactNode
  parlamentares: React.ReactNode
  alertas: React.ReactNode
  configuracoes: React.ReactNode
  meusDados: React.ReactNode
}

export default function PainelLayout({
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

  return (
    <>
      <TabBar />
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
