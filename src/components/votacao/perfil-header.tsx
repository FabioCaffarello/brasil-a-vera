import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { TrustBadge } from '@/components/trust/trust-badge'
import { CompartilharVotacaoButton } from '@/components/votacao/compartilhar-button'
import { DataBadge } from '@/design-system/compositions/data-badge'
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

/**
 * Perfil header votação — Sprint 6.3 PR 3 (Wave 6) +
 * Wave 9 Sprint 9.2 PR2 (breadcrumb "← Votações").
 *
 * DataBadges no topo (casa + órgão + data/hora + aprovada/rejeitada com
 * tone semântico) já entregam a "sub-line" narrativa cravada no plano —
 * não há necessidade de linha adicional. Layout mantém DataBadges ACIMA
 * do h1 porque a descrição da votação tende a ser longa, e contexto
 * (casa/data/resultado) é o filtro mental de scan rápido.
 *
 * Breadcrumb "← Votações" espelha padrão Wave 7 (parlamentares) + Wave 8
 * (proposicoes): contexto para visitantes vindos de link compartilhado.
 *
 * Trust badge + source url preservados (P2 — honestidade do dado).
 */
export function PerfilVotacaoHeader({ votacao: v }: Props) {
  return (
    <div>
      <Link
        className="mb-3 inline-flex items-center gap-1 rounded text-foreground-muted text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href="/votacoes"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Votações
      </Link>

      <header className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <DataBadge
            label={v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
            source={v.orgao}
            tone="brand"
          />
          <DataBadge label={formatDataHoraBR(v.dataHora)} tone="default" />
          <DataBadge
            label={v.aprovada ? 'Aprovada' : 'Rejeitada'}
            tone={v.aprovada ? 'success' : 'destructive'}
          />
        </div>

        <h1 className="font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
          {v.descricao}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <TrustBadge trustLevel={v.trustLevel} />
          <a
            className="rounded text-foreground-muted underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
