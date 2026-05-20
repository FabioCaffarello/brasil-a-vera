// Componentes tipográficos compartilhados pelas páginas de /docs. Mantidos
// dentro de `_components/` (prefixo `_` opcional do Next.js para excluir do
// roteamento) por serem específicos do escopo /docs. Não generalizar para
// `components/ui/` enquanto for usado só aqui.

import Link from 'next/link'

export const docsLinkClass =
  'text-brand underline underline-offset-2 transition-colors duration-150 hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

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
      <h2 className="mb-3 font-medium text-foreground-muted text-sm uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-4 text-base text-foreground">{children}</div>
    </section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>
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
      <h1 className="font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-foreground-muted text-lg">{subtitle}</p>
    </header>
  )
}
