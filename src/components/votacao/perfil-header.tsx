import { TrustBadge } from '@/components/trust/trust-badge'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { formatDataHoraBR } from '@/lib/format'

interface Props {
  votacao: {
    casa: string
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    sourceUrl: string
    trustLevel: 'L1' | 'L2' | 'L3' | 'L4'
  }
}

/**
 * Perfil header votação — Sprint 6.3 PR 3 (Wave 6, reskin perfis).
 *
 * Refactor incremental vs Sprint 4.2 PR 5:
 * - DataBadges no topo (casa + órgão tone=brand, data/hora tone=default,
 *   aprovada/rejeitada tone=success/destructive em destaque)
 * - h1 maior (text-2xl sm:text-3xl — descrição da votação pode ser longa,
 *   não exagero)
 * - Padding header sm:p-8 — consistência com parlamentar + proposição
 * - Estrutura semântica preservada
 */
export function PerfilVotacaoHeader({ votacao: v }: Props) {
  return (
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
    </header>
  )
}
