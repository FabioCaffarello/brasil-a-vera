import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type { VotacaoRelacionada } from '@/lib/queries/votacoes'

interface Props {
  votacoes: readonly VotacaoRelacionada[]
}

const RELACAO_LABEL: Record<string, string> = {
  mesma_proposicao: 'Mesma proposição',
  mesmo_orgao_janela: 'Mesmo órgão',
}

const CASA_LABEL: Record<string, string> = {
  CAMARA: 'Câmara',
  SENADO: 'Senado',
}

/**
 * VotacoesRelacionadasFooter — Wave 9 Sprint 9.4 PR3 (fecha Sprint 9.4).
 *
 * Cross-links contextuais no fim do detalhe. Reusa
 * getVotacoesRelacionadas (Sprint 9.0 PR 9.0.2, cached 7d): prioriza
 * "mesma_proposicao" (mais relevante) → "mesmo_orgao_janela" (±30d).
 *
 * Card por votação relacionada:
 * - Tag colorida da relação (brand para mesma_proposicao, muted para
 *   mesmo_orgao_janela)
 * - Casa + data + resultado
 * - Descrição truncada via line-clamp-2
 *
 * Empty state: se votacoes.length === 0, não renderiza nada — sem
 * placeholder "nada relacionado encontrado", apenas some.
 */
export function VotacoesRelacionadasFooter({ votacoes }: Props) {
  if (votacoes.length === 0) return null

  return (
    <section
      aria-labelledby="footer-relacionadas-title"
      className="mt-8 border-border border-t pt-6"
    >
      <h2
        className="mb-3 font-semibold text-foreground text-lg"
        id="footer-relacionadas-title"
      >
        Outras votações relacionadas
      </h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {votacoes.map((v) => {
          const relacaoTone =
            v.relacao === 'mesma_proposicao'
              ? 'bg-brand/15 text-brand'
              : 'bg-surface-elevated text-foreground-muted'
          const resultadoTone = v.aprovada ? 'text-success' : 'text-destructive'
          return (
            <li key={v.id}>
              <Link
                className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={`/votacoes/${v.id}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 font-medium ${relacaoTone}`}
                  >
                    {RELACAO_LABEL[v.relacao] ?? v.relacao}
                  </span>
                  <span className="text-foreground-muted">
                    {CASA_LABEL[v.casa] ?? v.casa}
                  </span>
                  <span className="text-foreground-muted">·</span>
                  <span className="text-foreground-muted">
                    {formatDataBR(v.dataHora)}
                  </span>
                  <span className="text-foreground-muted">·</span>
                  <span className={`font-medium ${resultadoTone}`}>
                    {v.aprovada ? 'Aprovada' : 'Rejeitada'}
                  </span>
                </div>
                <p className="line-clamp-2 text-foreground text-sm">
                  {v.descricao}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
