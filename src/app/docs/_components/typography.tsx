// Componentes tipográficos compartilhados pelas páginas de /docs. Mantidos
// dentro de `_components/` (prefixo `_` opcional do Next.js para excluir do
// roteamento) por serem específicos do escopo /docs. Não generalizar para
// `components/ui/` enquanto for usado só aqui.

import Link from 'next/link'

export const docsLinkClass =
  'text-primary-700 underline underline-offset-2 transition-colors duration-150 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-300 dark:hover:text-primary-100'

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
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="space-y-4 text-base text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
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
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
        {subtitle}
      </p>
    </header>
  )
}
