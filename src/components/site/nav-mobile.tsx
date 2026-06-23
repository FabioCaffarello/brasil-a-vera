'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'

import { SearchForm } from '@/components/busca/search-form'
import { cn } from '@/lib/cn'

import { isNavLinkActive, NAV_LINKS, type NavLink } from './nav-links'

interface Props {
  /**
   * Wave 10 Hotfix 10.3 — link único da área pessoal renderizado primeiro
   * na lista do painel mobile. Espelha o contrato de `NavLinks`. Resolvido
   * server-side no Navbar (regra: nada de `useAuth`/`useUser` aqui).
   */
  personalLink?: NavLink | null
}

/**
 * NavMobile — trigger + painel embutido para < md.
 *
 * Painel:
 * - Posicionado absolute logo abaixo do shell (top-full).
 * - Mesma textura `glass-strong` para coerência visual.
 * - Lista vertical dos NAV_LINKS + SearchForm full-width.
 * - Fecha ao trocar de rota (efeito sobre pathname) e via Escape.
 * - Body scroll lock enquanto aberto (UX clássica de drawer mobile).
 *
 * A11y:
 * - Trigger é <button> nativo com aria-expanded e aria-controls.
 * - Painel é <div role="dialog" aria-modal="true" aria-label="Menu">.
 * - Focus inicial vai para o primeiro link via tabindex natural.
 * - Escape fecha (key listener global, removido on close).
 *
 * Sem portal — render dentro do próprio shell sticky. Isso:
 * - Mantém z-index simples (shell já é z-30).
 * - Evita problemas de SSR/hydration de portais.
 * - Animação CSS pura (opacity + translate) respeita
 *   prefers-reduced-motion via override global em globals.css.
 */
export function NavMobile({ personalLink }: Props = {}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const links: NavLink[] = personalLink
    ? [personalLink, ...NAV_LINKS]
    : NAV_LINKS

  // Fecha quando a rota muda. pathname é o gatilho intencional; lemos
  // explicitamente para deixar a dependência óbvia ao linter.
  useEffect(() => {
    void pathname
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-tertiary transition-colors md:hidden',
          'hover:bg-fg-primary/5 hover:text-fg-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? (
          <X aria-hidden="true" className="h-5 w-5" />
        ) : (
          <Menu aria-hidden="true" className="h-5 w-5" />
        )}
      </button>

      {/* Overlay clique-fora — só renderiza quando aberto pra não
          interceptar clicks no estado fechado. Backdrop escuro forte
          (bg-background/80) + blur leve para apagar conteúdo da página. */}
      {open ? (
        <button
          aria-hidden="true"
          className="fixed inset-x-0 top-16 bottom-0 z-20 cursor-default bg-surface-canvas/80 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      {/* Painel: surface opaco para legibilidade total sobre conteúdo da
          página (ADR-024 §glass apenas em shells sticky onde transparência
          é proposital — menu mobile precisa ser sólido). */}
      <div
        aria-hidden={!open}
        aria-label="Menu principal"
        aria-modal={open}
        className={cn(
          'absolute inset-x-0 top-full z-30 origin-top border-border border-b bg-surface shadow-soft md:hidden',
          'transition-[opacity,transform] duration-200 ease-out',
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0',
        )}
        id={panelId}
        role="dialog"
      >
        <div className="mx-auto max-w-6xl px-4 py-4">
          <SearchForm variant="page" />
          <ul className="mt-4 flex flex-col gap-0.5 text-sm">
            {links.map((link) => {
              const isActive = isNavLinkActive(pathname, link.href)
              return (
                <li key={link.href}>
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center rounded-md px-3 py-2.5 font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      isActive
                        ? 'bg-fg-primary/10 text-fg-primary ring-1 ring-fg-primary/10'
                        : 'text-fg-tertiary hover:bg-fg-primary/5 hover:text-fg-primary',
                    )}
                    href={link.href}
                    tabIndex={open ? 0 : -1}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </>
  )
}
