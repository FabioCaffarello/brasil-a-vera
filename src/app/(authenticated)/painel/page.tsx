// `/painel` — neutral entry-point — Fase 2 do refator pós-Wave 10
// (RFC `docs/product/REFACTOR-PAINEL-TABS.md` §3 / ADR-032).
//
// Page.tsx é exigido pelo Next.js para a rota `/painel` ser navegável,
// mas o conteúdo real vive nos 5 slots Parallel Routes (`@resumo/`,
// `@parlamentares/`, `@alertas/`, `@configuracoes/`, `@meusDados/`).
// O layout.tsx vizinho compõe os slots via `<ActiveSlotPicker />`.
//
// `generateMetadata` dinâmica vive AQUI (não no layout) porque layouts
// em Next.js não recebem `searchParams` (RFC §4 D5).
//
// O conteúdo do antigo `/painel/page.tsx` (Resumo) está em
// `@resumo/page.tsx`.

import { parseTab, type TabKey } from '@/lib/painel-tabs'

const TITLES: Record<TabKey, string> = {
  resumo: 'Painel — Brasil à Vera',
  parlamentares: 'Parlamentares — Painel',
  alertas: 'Alertas — Painel',
  configuracoes: 'Configurações — Painel',
  'meus-dados': 'Meus dados — Painel',
}

interface PageProps {
  searchParams: Promise<{ tab?: string | string[] }>
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams
  const tab = parseTab(params.tab)
  return { title: TITLES[tab] }
}

export default function PainelPage() {
  // Slots cobrem toda a área de conteúdo via ActiveSlotPicker no layout.
  return null
}
