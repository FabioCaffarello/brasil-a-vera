import {
  Card,
  CardActions,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type EntryCardProps = {
  /** Ícone do card (geralmente `lucide-react`, ex.: `<Users>`). Decorativo. */
  icon: ReactNode
  /** Título da porta de entrada — renderizado como `<h3>` via `Card.Title`. */
  title: ReactNode
  /** Descrição curta logo abaixo do título. */
  description: ReactNode
  /** Destino do card (a página que essa porta de entrada abre). */
  href: string
  /** Rótulo do CTA no rodapé. Default: "Explorar". */
  cta?: string
  className?: string
}

/**
 * EntryCard — porta de entrada cívica da home.
 *
 * Composição sobre o `Card` compound do RDS
 * (@fabio.caffarello/react-design-system/server). DRY das portas de entrada
 * navegacionais: um único shape (ícone → título → descrição → CTA) reusado no
 * grid de "Comece por aqui", substituindo os cards bespoke por card.
 *
 * Equal-height sem hack: `h-full` deixa o Card preencher a célula do grid
 * (que já estica por `align-items: stretch`) e `mt-auto` no `CardActions`
 * ancora o CTA no rodapé — elimina o antigo `<div className="flex-1" />`.
 *
 * Server Component. Token-driven (ADR-021), zero hardcode de cor. Hover em
 * `border-line-emphasis` — mesma linguagem dos demais cards da home.
 */
export function EntryCard({
  icon,
  title,
  description,
  href,
  cta = 'Explorar',
  className,
}: EntryCardProps) {
  return (
    <Card
      className={cn(
        'flex h-full flex-col transition-colors hover:border-line-emphasis',
        className,
      )}
    >
      <CardHeader>
        <div
          aria-hidden
          className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface-raised text-fg-brand"
        >
          {icon}
        </div>
        <CardTitle as="h3" className="text-lg">
          {title}
        </CardTitle>
        <CardSubtitle>{description}</CardSubtitle>
      </CardHeader>
      <CardActions className="mt-auto">
        <Link
          aria-label={typeof title === 'string' ? title : undefined}
          className="inline-flex items-center font-medium text-fg-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href={href}
        >
          {cta} <span aria-hidden>→</span>
        </Link>
      </CardActions>
    </Card>
  )
}
