import { TrustBadge } from '@/components/trust/trust-badge'
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

// Sprint 4.2 PR 5 commit 3/8 — refatorado para tokens semânticos.
// Badge aprovada/rejeitada usa o mesmo padrão de `votacao-card` (PR 2):
// `bg-success/20 text-success` vs `bg-destructive/20 text-destructive`.
export function PerfilVotacaoHeader({ votacao: v }: Props) {
  return (
    <header className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-foreground-muted text-sm">
        <span>{formatDataHoraBR(v.dataHora)}</span>
        <span aria-hidden>·</span>
        <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
        <span aria-hidden>·</span>
        <span>{v.orgao}</span>
        <span aria-hidden>·</span>
        <span
          className={
            v.aprovada
              ? 'rounded bg-success/20 px-2 py-0.5 font-medium text-success text-xs'
              : 'rounded bg-destructive/20 px-2 py-0.5 font-medium text-destructive text-xs'
          }
        >
          {v.aprovada ? 'Aprovada' : 'Rejeitada'}
        </span>
      </div>

      <h1 className="font-semibold text-foreground text-xl">{v.descricao}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <TrustBadge trustLevel={v.trustLevel} />
        <a
          className="text-foreground-muted underline decoration-dotted underline-offset-2 hover:text-foreground"
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
