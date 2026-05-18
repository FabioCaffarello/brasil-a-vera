import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'
import type { ProposicaoRelacionada } from '@/lib/queries/proposicoes-relacionadas'

interface Props {
  /** Nome do autor principal (primeiro AUTOR parlamentar da lista de
   * autores). Usado no label "Outras proposições de {nome}". Null
   * quando autoria é apenas por órgão (estado `autoria_orgao_only`). */
  autorPrincipalNome: string | null
  /** Top N proposições do mesmo autor principal (já excluindo a
   * proposição atual). Vazio quando autor é só órgão OU quando autor
   * parlamentar não tem outras autorias. */
  mesmoAutor: ProposicaoRelacionada[]
  /** Top N proposições com o mesmo tema canônico (já excluindo a
   * proposição atual). Vazio quando proposição não tem tema catalogado
   * OU quando é única no tema. */
  mesmoTema: ProposicaoRelacionada[]
}

/**
 * Footer cross-links do detalhe da proposição — Wave 8 Sprint 8.2 PR5
 * (fecha sprint). Espelha padrão estabelecido por /parlamentares pós
 * Wave 7 Sprint 7.2 PR5.
 *
 * Implementa o contrato de fallback cravado no plano (§Contratos de
 * fallback — Footer cross-links):
 *
 * - com_autor_parlamentar: "Outras proposições de {nome}"
 * - autoria_orgao_only: suprime bloco mesmo-autor (mostra só mesmo-tema)
 * - tema_canonico_orphan: suprime bloco mesmo-tema (mostra só mesmo-autor)
 * - nem_um_nem_outro: footer fica só com "Voltar para listagem →"
 *
 * Honestidade P2: cada bloco só renderiza com pelo menos 1 item — nada
 * de "Outras proposições de João Silva: nenhuma encontrada".
 */
export function FooterCrossLinks({
  autorPrincipalNome,
  mesmoAutor,
  mesmoTema,
}: Props) {
  const temAutor = mesmoAutor.length > 0 && autorPrincipalNome !== null
  const temTema = mesmoTema.length > 0
  return (
    <footer className="mt-10 space-y-6 border-border border-t pt-8">
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
        className="inline-flex items-center gap-2 rounded text-foreground-muted text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      <h2 className="mb-3 font-semibold text-foreground text-sm uppercase tracking-wide">
        {title}
      </h2>
      <ul className="space-y-2">
        {proposicoes.map((p) => (
          <li key={p.id}>
            <Link
              className="group flex items-start gap-2 rounded text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
            >
              <ArrowRight
                aria-hidden
                className="mt-1 h-3.5 w-3.5 shrink-0 text-foreground-subtle transition-transform group-hover:translate-x-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium font-mono text-foreground-muted">
                  {formatProposicaoRef(p.tipo, p.numero, p.ano)}
                </span>
                <span className="text-foreground-muted"> — </span>
                <span className="line-clamp-2 text-foreground">{p.ementa}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
