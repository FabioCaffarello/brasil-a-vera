// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { Card, DataBadge } from '@fabio.caffarello/react-design-system/server'

import { CompartilharProposicaoButton } from '@/components/proposicao/compartilhar-button'
import { situacaoStatus } from '@/components/proposicao/situacao'
import { TrustBadge } from '@/components/trust/trust-badge'
import { formatProposicaoRef } from '@/lib/format'

interface Props {
  proposicao: {
    tipo: string
    numero: number
    ano: number
    ementa: string
    ementaDetalhada: string | null
    situacao: string
    regime: string | null
    sourceUrl: string
    trustLevel: 'L1' | 'L2' | 'L3' | 'L4'
  }
  /** Stats agregados. Usado pelo botão Compartilhar para enriquecer o
   * texto pré-formatado. Null = texto reduzido (P2). */
  stats?: {
    diasEmTramitacao: number | null
    nAutores: number | null
  } | null
}

// A fonte manda regime "." ou só pontuação, que passa no truthiness e
// renderizava "Regime: ." (auditoria UX 2026-07-20).
function regimeLimpo(regime: string | null): string | null {
  const limpo = regime?.trim().replace(/^[.··\-–—]+$/, '') ?? ''
  return limpo === '' ? null : limpo
}

export function PerfilProposicaoHeader({ proposicao, stats }: Props) {
  const ref = formatProposicaoRef(
    proposicao.tipo,
    proposicao.numero,
    proposicao.ano,
  )
  return (
    <Card className="p-6 sm:p-8" padding="none" variant="default">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono font-semibold text-3xl text-fg-primary tracking-tight sm:text-4xl">
          {ref}
        </h1>
        <DataBadge {...situacaoStatus(proposicao.situacao)} />
      </div>

      <p className="text-fg-primary text-lg">
        {proposicao.ementa || (
          <span className="text-fg-quaternary italic">(sem ementa)</span>
        )}
      </p>

      {proposicao.ementaDetalhada &&
        proposicao.ementaDetalhada !== proposicao.ementa && (
          <details className="mt-3">
            <summary className="cursor-pointer text-fg-tertiary text-sm hover:text-fg-primary">
              Ementa detalhada
            </summary>
            <p className="mt-2 whitespace-pre-line text-fg-primary text-sm">
              {proposicao.ementaDetalhada}
            </p>
          </details>
        )}

      {regimeLimpo(proposicao.regime) ? (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-fg-primary text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-medium">Regime: </dt>
            <dd className="inline">{regimeLimpo(proposicao.regime)}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <TrustBadge trustLevel={proposicao.trustLevel} />
        <a
          className="rounded text-fg-tertiary underline decoration-dotted underline-offset-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href={proposicao.sourceUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Ver na fonte oficial ↗
        </a>
      </div>

      <div className="mt-4 pt-3">
        <CompartilharProposicaoButton
          proposicao={{
            ref,
            ementa: proposicao.ementa,
            diasEmTramitacao: stats?.diasEmTramitacao ?? null,
            nAutores: stats?.nAutores ?? null,
          }}
        />
      </div>
    </Card>
  )
}
