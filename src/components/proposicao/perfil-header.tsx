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
// `proposicao-card.tsx`. Solid `bg-success` em TRANSFORMADA_EM_NORMA
// reforça hierarquia visual (virou lei = pinnacle outcome).
const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO: 'bg-brand/20 text-brand',
  APROVADA: 'bg-success/20 text-success',
  REJEITADA: 'bg-destructive/20 text-destructive',
  ARQUIVADA: 'bg-surface-elevated text-foreground-muted',
  TRANSFORMADA_EM_NORMA: 'bg-success text-success-foreground',
}

/**
 * Perfil header proposição — Sprint 6.3 PR 2 (Wave 6, reskin perfis).
 *
 * Refactor incremental vs Sprint 4.2 PR 4:
 * - h1 maior (text-3xl sm:text-4xl) — ref proposição protagonista
 * - Badge situação ganha tamanho text-sm + padding ligeiramente maior
 *   (px-3 py-1) — equivale-se visualmente ao h1 grande
 * - Padding header maior (p-6 sm:p-8) — consistência com parlamentar
 *   PerfilHeader pós-Sprint 6.3 PR 1
 * - Estrutura semântica preservada
 */
export function PerfilProposicaoHeader({ proposicao }: Props) {
  const ref = formatProposicaoRef(
    proposicao.tipo,
    proposicao.numero,
    proposicao.ano,
  )
  const situacaoClass =
    SITUACAO_CLASSES[proposicao.situacao] ?? SITUACAO_CLASSES.ARQUIVADA
  return (
    <header className="rounded-lg border border-border bg-surface p-6 sm:p-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
          {ref}
        </h1>
        <span
          className={`inline-flex items-center rounded px-3 py-1 font-medium text-sm ${situacaoClass}`}
        >
          {SITUACAO_LABELS[proposicao.situacao] ?? proposicao.situacao}
        </span>
      </div>

      <p className="text-foreground text-lg">
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

      {proposicao.regime ? (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-foreground text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-medium">Regime: </dt>
            <dd className="inline">{proposicao.regime}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <TrustBadge trustLevel={proposicao.trustLevel} />
        <a
          className="rounded text-foreground-muted underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
