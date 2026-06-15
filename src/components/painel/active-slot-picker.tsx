'use client'

// Promovido ao RDS (ADR-033).
// (área logada /painel). DUPLICADO como client island (decisão #4 do
// scoping): Next.js layouts não recebem searchParams; este client component lê
// `useSearchParams()` e retorna o slot ativo como children. Slots inativos
// retornam null (não display:none) — as 5 RSC dos slots rodam server-side em
// paralelo, mas só uma é montada na DOM final.
//
// Sem classnames (puro switch de ReactNode) → sem tradução de token. Importa o
// `parseTab` puro do util ORIGINAL (lógica pura, decisão #4). Original INTOCADO.

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
      return resumo
  }
}
