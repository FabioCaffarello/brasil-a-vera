// Componentes tipográficos compartilhados pelas páginas de /docs. Mantidos
// dentro de `_components/` (prefixo `_` opcional do Next.js para excluir do
// roteamento) por serem específicos do escopo /docs. Não generalizar para
// `components/ui/` enquanto for usado só aqui.
//
// Tokens do design system @fabio.caffarello/react-design-system (famílias
// fg-*/surface-*/line-*); tradução pela tabela canônica
// docs/migration/token-map.md. Espelha o padrão de /privacidade (helper
// local + `Text` do RDS); h1/h2 ficam HTML cru porque combinam 3 props de
// typography (font + size + tracking) que nenhum `variant` cobre sem 2+
// overrides.

import { Text } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

export const docsLinkClass =
  'text-fg-brand underline underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas'

export function Section({
  title,
  children,
  id,
}: {
  title: string
  children: React.ReactNode
  id?: string
}) {
  return (
    <section className="mb-12" id={id}>
      <h2 className="mb-3 font-medium text-fg-tertiary text-sm uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-4 text-base text-fg-primary">{children}</div>
    </section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="body" className="text-fg-primary leading-relaxed">
      {children}
    </Text>
  )
}

export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 leading-relaxed">{children}</ul>
}

export function Li({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">— {children}</li>
}

export function InternalLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={docsLinkClass}>
      {children}
    </Link>
  )
}

export function ExternalLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={docsLinkClass}
    >
      {children}
    </a>
  )
}

export function DocsHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="mb-10">
      <h1 className="font-semibold text-3xl text-fg-primary tracking-tight sm:text-4xl">
        {title}
      </h1>
      <Text variant="body" className="mt-2 text-fg-tertiary text-lg">
        {subtitle}
      </Text>
    </header>
  )
}
