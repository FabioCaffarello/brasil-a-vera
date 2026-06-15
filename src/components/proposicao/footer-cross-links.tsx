// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'
import type { ProposicaoRelacionada } from '@/lib/queries/proposicoes-relacionadas'

interface Props {
  /** Nome do autor principal. Null quando autoria é apenas por órgão. */
  autorPrincipalNome: string | null
  /** Top N proposições do mesmo autor principal (excluindo a atual). */
  mesmoAutor: ProposicaoRelacionada[]
  /** Top N proposições com o mesmo tema canônico (excluindo a atual). */
  mesmoTema: ProposicaoRelacionada[]
}

export function FooterCrossLinks({
  autorPrincipalNome,
  mesmoAutor,
  mesmoTema,
}: Props) {
  const temAutor = mesmoAutor.length > 0 && autorPrincipalNome !== null
  const temTema = mesmoTema.length > 0
  return (
    <footer className="mt-10 space-y-6 border-line-default border-t pt-8">
      {temAutor ? (
        <CrossLinksBlock
          title={`Outras proposições de ${autorPrincipalNome}`}
          proposicoes={mesmoAutor}
        />
      ) : null}
      {temTema ? (
        <CrossLinksBlock
          title="Outras proposições neste tema"
          proposicoes={mesmoTema}
        />
      ) : null}
      <Link
        className="inline-flex items-center gap-2 rounded text-fg-tertiary text-sm hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
        href="/proposicoes"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Voltar para listagem
      </Link>
    </footer>
  )
}

function CrossLinksBlock({
  title,
  proposicoes,
}: {
  title: string
  proposicoes: ProposicaoRelacionada[]
}) {
  return (
    <section>
      <h2 className="mb-3 font-semibold text-fg-primary text-sm uppercase tracking-wide">
        {title}
      </h2>
      <ul className="space-y-2">
        {proposicoes.map((p) => (
          <li key={p.id}>
            <Link
              className="group flex items-start gap-2 rounded text-sm hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
              href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
            >
              <ArrowRight
                aria-hidden
                className="mt-1 h-3.5 w-3.5 shrink-0 text-fg-quaternary transition-transform group-hover:translate-x-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium font-mono text-fg-tertiary">
                  {formatProposicaoRef(p.tipo, p.numero, p.ano)}
                </span>
                <span className="text-fg-tertiary"> — </span>
                <span className="line-clamp-2 text-fg-primary">{p.ementa}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
