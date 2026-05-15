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
}

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Em tramitação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Transformada em norma jurídica',
}

// Sprint 4.2 PR 4 commit 2/7 — mesmo mapping usado em
// `proposicao-card.tsx` (Sprint 4.2 PR 2). Solid `bg-success` em
// TRANSFORMADA_EM_NORMA reforça hierarquia visual (virou lei é o
// pinnacle outcome do ciclo legislativo).
const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO: 'bg-brand/20 text-brand',
  APROVADA: 'bg-success/20 text-success',
  REJEITADA: 'bg-destructive/20 text-destructive',
  ARQUIVADA: 'bg-surface-elevated text-foreground-muted',
  TRANSFORMADA_EM_NORMA: 'bg-success text-success-foreground',
}

export function PerfilProposicaoHeader({ proposicao }: Props) {
  const ref = formatProposicaoRef(
    proposicao.tipo,
    proposicao.numero,
    proposicao.ano,
  )
  const situacaoClass =
    SITUACAO_CLASSES[proposicao.situacao] ?? SITUACAO_CLASSES.ARQUIVADA
  return (
    <header className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono font-semibold text-2xl text-foreground">
          {ref}
        </h1>
        <span
          className={`inline-flex items-center rounded px-2.5 py-0.5 font-medium text-xs ${situacaoClass}`}
        >
          {SITUACAO_LABELS[proposicao.situacao] ?? proposicao.situacao}
        </span>
      </div>

      <p className="text-base text-foreground">
        {proposicao.ementa || (
          <span className="text-foreground-subtle italic">(sem ementa)</span>
        )}
      </p>

      {proposicao.ementaDetalhada &&
        proposicao.ementaDetalhada !== proposicao.ementa && (
          <details className="mt-3">
            <summary className="cursor-pointer text-foreground-muted text-sm hover:text-foreground">
              Ementa detalhada
            </summary>
            <p className="mt-2 whitespace-pre-line text-foreground text-sm">
              {proposicao.ementaDetalhada}
            </p>
          </details>
        )}

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-foreground text-sm sm:grid-cols-2">
        {proposicao.regime && (
          <div>
            <dt className="inline font-medium">Regime: </dt>
            <dd className="inline">{proposicao.regime}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <TrustBadge trustLevel={proposicao.trustLevel} />
        <a
          className="text-foreground-muted underline decoration-dotted underline-offset-2 hover:text-foreground"
          href={proposicao.sourceUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Ver na fonte oficial ↗
        </a>
      </div>
    </header>
  )
}
