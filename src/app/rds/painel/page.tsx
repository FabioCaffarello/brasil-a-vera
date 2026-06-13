// Cópia-rds de src/app/(authenticated)/painel/page.tsx — migração painel
// (área logada /rds/painel). Neutral entry-point.
//
// Page.tsx é exigido pelo Next.js para a rota `/rds/painel` ser navegável, mas
// o conteúdo real vive nos 5 slots Parallel Routes (`@resumo/`,
// `@parlamentares/`, `@alertas/`, `@configuracoes/`, `@meusDados/`). O
// layout.tsx vizinho compõe os slots via <ActiveSlotPicker />.
//
// `generateMetadata` dinâmica vive AQUI (não no layout) porque layouts em
// Next.js não recebem `searchParams`. Titles com sufixo `(rds-pilot)` (padrão
// das pilotos). O noindex vem do /rds/layout.tsx (metadata.robots) +
// next.config (X-Robots-Tag) + robots.ts.

import { parseTab, type TabKey } from '@/lib/painel-tabs'

const TITLES: Record<TabKey, string> = {
  resumo: 'Painel — Brasil à Vera (rds-pilot)',
  parlamentares: 'Parlamentares — Painel (rds-pilot)',
  alertas: 'Alertas — Painel (rds-pilot)',
  configuracoes: 'Configurações — Painel (rds-pilot)',
  'meus-dados': 'Meus dados — Painel (rds-pilot)',
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
