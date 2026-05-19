'use client'

// ActiveSlotPicker — Fase 2 do refator do painel pós-Wave 10
// (RFC `docs/product/REFACTOR-PAINEL-TABS.md` §3/§4 D1/§12 AP7, ADR-032).
//
// Por que isto existe:
//   Next.js layouts NÃO recebem `searchParams` (apenas slot props +
//   children). Para gating server-side de "qual slot é o ativo" sob
//   query param `?tab=`, este client component lê `useSearchParams()`
//   e retorna o slot ativo como children. Slots inativos retornam null
//   (NÃO `display:none` — AP7). Isto significa que as 5 RSC dos slots
//   ainda rodam server-side em paralelo (custo aceito conscientemente
//   em §4 D9 / §7 R1 — mitigado por cached() ADR-018), mas só uma é
//   montada na DOM final.
//
// Sem dependência nova. ReactNode dos slots vem do layout server-side.

import { useSearchParams } from 'next/navigation'

import { parseTab } from '@/lib/painel-tabs'

interface Props {
  resumo: React.ReactNode
  parlamentares: React.ReactNode
  alertas: React.ReactNode
  configuracoes: React.ReactNode
  meusDados: React.ReactNode
}

export function ActiveSlotPicker({
  resumo,
  parlamentares,
  alertas,
  configuracoes,
  meusDados,
}: Props) {
  const tab = parseTab(useSearchParams().get('tab'))

  switch (tab) {
    case 'parlamentares':
      return parlamentares
    case 'alertas':
      return alertas
    case 'configuracoes':
      return configuracoes
    case 'meus-dados':
      return meusDados
    default:
      // exhaustive: 'resumo' is the only remaining case (parseTab
      // garante TabKey válido)
      return resumo
  }
}
