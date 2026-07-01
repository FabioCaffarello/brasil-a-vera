// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { Card, DataBadge } from '@fabio.caffarello/react-design-system/server'
import { TrustBadge } from '@/components/trust/trust-badge'
import { CompartilharVotacaoButton } from '@/components/votacao/compartilhar-button'
import { resultadoStatus } from '@/components/votacao/resultado'
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
    <Card className="p-6 sm:p-8" padding="none" variant="default">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DataBadge
          label={v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
          source={v.orgao}
          tone="primary"
        />
        <DataBadge label={formatDataHoraBR(v.dataHora)} tone="neutral" />
        <DataBadge {...resultadoStatus(v.aprovada)} />
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
    </Card>
  )
}
