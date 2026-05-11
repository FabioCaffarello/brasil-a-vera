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

const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  APROVADA:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  REJEITADA: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  ARQUIVADA: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  TRANSFORMADA_EM_NORMA:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
}

export function PerfilProposicaoHeader({ proposicao }: Props) {
  const ref = formatProposicaoRef(
    proposicao.tipo,
    proposicao.numero,
    proposicao.ano,
  )
  const situacaoClass =
    SITUACAO_CLASSES[proposicao.situacao] ??
    'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
  return (
    <header className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {ref}
        </h1>
        <span
          className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium ${situacaoClass}`}
        >
          {SITUACAO_LABELS[proposicao.situacao] ?? proposicao.situacao}
        </span>
      </div>

      <p className="text-base text-zinc-800 dark:text-zinc-200">
        {proposicao.ementa || (
          <span className="italic text-zinc-500">(sem ementa)</span>
        )}
      </p>

      {proposicao.ementaDetalhada &&
        proposicao.ementaDetalhada !== proposicao.ementa && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Ementa detalhada
            </summary>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
              {proposicao.ementaDetalhada}
            </p>
          </details>
        )}

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
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
          href={proposicao.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Ver na fonte oficial ↗
        </a>
      </div>
    </header>
  )
}
