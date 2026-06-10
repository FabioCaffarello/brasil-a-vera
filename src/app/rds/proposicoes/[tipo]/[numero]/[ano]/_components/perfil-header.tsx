// Cópia-rds de src/components/proposicao/perfil-header.tsx (piloto-3).
// Server Component. Tokens traduzidos pela tabela canônica + extensões.
// Client islands compartilhados (CompartilharProposicaoButton,
// TrustBadge) importados dos originais (precedente piloto-2).
// `bg-success text-success-foreground` (TRANSFORMADA_EM_NORMA, badge
// sólido) MANTIDO: o RDS não tem token on-success (success-bg é tint,
// não on-color) — resíduo registrado na extensão piloto-3 do
// token-map.md, mesmo destino do `accent`.

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { CompartilharProposicaoButton } from '@/components/proposicao/compartilhar-button'
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

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Em tramitação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Transformada em norma jurídica',
}

// Mesmo mapping do original (proposicao-card.tsx). Solid `bg-success`
// em TRANSFORMADA_EM_NORMA reforça hierarquia (virou lei = pinnacle).
// Traduções piloto-2/3: brand→fg-brand, destructive→error,
// surface-elevated→surface-raised; success/N e success-foreground
// mantidos (ver header).
const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO: 'bg-fg-brand/20 text-fg-brand',
  APROVADA: 'bg-success/20 text-fg-success',
  REJEITADA: 'bg-error/20 text-fg-error',
  ARQUIVADA: 'bg-surface-raised text-fg-tertiary',
  TRANSFORMADA_EM_NORMA: 'bg-success text-success-foreground',
}

export function PerfilProposicaoHeader({ proposicao, stats }: Props) {
  const ref = formatProposicaoRef(
    proposicao.tipo,
    proposicao.numero,
    proposicao.ano,
  )
  const situacaoClass =
    SITUACAO_CLASSES[proposicao.situacao] ?? SITUACAO_CLASSES.ARQUIVADA
  return (
    <div>
      <Link
        className="mb-3 inline-flex items-center gap-1 rounded text-fg-tertiary text-sm hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
        href="/proposicoes"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Proposições
      </Link>

      <header className="rounded-lg border border-line-default bg-surface-base p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h1 className="font-mono font-semibold text-3xl text-fg-primary tracking-tight sm:text-4xl">
            {ref}
          </h1>
          <span
            className={`inline-flex items-center rounded px-3 py-1 font-medium text-sm ${situacaoClass}`}
          >
            {SITUACAO_LABELS[proposicao.situacao] ?? proposicao.situacao}
          </span>
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

        {proposicao.regime ? (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-fg-primary text-sm sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Regime: </dt>
              <dd className="inline">{proposicao.regime}</dd>
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
      </header>
    </div>
  )
}
