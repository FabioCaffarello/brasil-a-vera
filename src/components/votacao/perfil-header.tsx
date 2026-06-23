// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { DataBadge } from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { TrustBadge } from '@/components/trust/trust-badge'
import { CompartilharVotacaoButton } from '@/components/votacao/compartilhar-button'
import { formatDataHoraBR } from '@/lib/format'

interface Props {
  votacao: {
    casa: 'CAMARA' | 'SENADO'
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    votosSim: number
    votosNao: number
    sourceUrl: string
    trustLevel: 'L1' | 'L2' | 'L3' | 'L4'
  }
}

export function PerfilVotacaoHeader({ votacao: v }: Props) {
  return (
    <div>
      <Link
        className="mb-3 inline-flex items-center gap-1 rounded text-fg-tertiary text-sm hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
        href="/votacoes"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Votações
      </Link>

      <header className="rounded-lg border border-line-default bg-surface-base p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <DataBadge
            label={v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
            source={v.orgao}
            tone="primary"
          />
          <DataBadge label={formatDataHoraBR(v.dataHora)} tone="neutral" />
          <DataBadge
            label={v.aprovada ? 'Aprovada' : 'Rejeitada'}
            tone={v.aprovada ? 'success' : 'error'}
          />
        </div>

        <h1 className="font-semibold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          {v.descricao}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <TrustBadge trustLevel={v.trustLevel} />
          <a
            className="rounded text-fg-tertiary underline decoration-dotted underline-offset-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
            href={v.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver na fonte oficial ↗
          </a>
        </div>

        <div className="mt-4 pt-3">
          <CompartilharVotacaoButton
            votacao={{
              descricao: v.descricao,
              aprovada: v.aprovada,
              votosSim: v.votosSim,
              votosNao: v.votosNao,
              casa: v.casa,
            }}
          />
        </div>
      </header>
    </div>
  )
}
