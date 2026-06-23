'use client'

import Link from 'next/link'
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

// Fábrica de "preview drawer" por domínio (parlamentar, proposição). Cada
// listagem instancia UM provider com estado `{ openItem, open, close }` e
// renderiza UM único <Drawer> — o item aberto vem do card clicado, então no
// máximo um painel existe por vez (respeita a disciplina de custo: nada de
// pré-renderizar N painéis). Os dados do preview são os que o card já tem como
// props — zero fetch novo.

export interface PreviewController<T> {
  /** Item aberto no drawer, ou null quando fechado. */
  openItem: T | null
  open: (item: T) => void
  close: () => void
}

export function createPreview<T>() {
  const Ctx = createContext<PreviewController<T> | null>(null)

  function Provider({ children }: { children: ReactNode }) {
    const [openItem, setOpenItem] = useState<T | null>(null)
    const open = useCallback((item: T) => setOpenItem(item), [])
    const close = useCallback(() => setOpenItem(null), [])
    const value = useMemo<PreviewController<T>>(
      () => ({ openItem, open, close }),
      [openItem, open, close],
    )
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }

  // Variante estrita: para o <Drawer>, que SÓ existe dentro do Provider —
  // lançar aqui pega misuse cedo.
  function usePreview(): PreviewController<T> {
    const ctx = useContext(Ctx)
    if (!ctx) {
      throw new Error('usePreview deve ser usado dentro do seu Provider')
    }
    return ctx
  }

  // Link do card com progressive enhancement. SEM JS (ou fora do Provider,
  // ex.: /busca): é um <a href> normal — navega para o detalhe, zero-JS,
  // crawlável (ADR-022). COM JS dentro da listagem: o clique simples (botão
  // esquerdo, sem modificadores) abre o drawer de preview em vez de navegar.
  // Cmd/Ctrl/Shift/Alt-clique e clique do meio continuam navegando (abrir em
  // nova aba) — não sequestramos o gesto de "abrir noutro lugar".
  function PreviewLink({
    href,
    data,
    className,
    children,
  }: {
    href: string
    data: T
    className?: string
    children: ReactNode
  }) {
    const ctx = useContext(Ctx)
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      if (!ctx) return
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }
      e.preventDefault()
      ctx.open(data)
    }
    return (
      <Link className={className} href={href} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return { Provider, usePreview, PreviewLink }
}
