import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'

interface Props {
  proposicao: {
    tipo: string
    numero: number
    ano: number
    ementa: string
    situacao: string
  }
}

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
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

export function ProposicaoCard({ proposicao }: Props) {
  const { tipo, numero, ano, ementa, situacao } = proposicao
  const href = `/proposicoes/${tipo}/${numero}/${ano}`
  const situacaoClasses =
    SITUACAO_CLASSES[situacao] ??
    'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {formatProposicaoRef(tipo, numero, ano)}
        </span>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${situacaoClasses}`}
        >
          {SITUACAO_LABELS[situacao] ?? situacao}
        </span>
      </div>
      <p className="line-clamp-3 text-sm text-zinc-800 dark:text-zinc-200">
        {ementa || <span className="italic text-zinc-500">(sem ementa)</span>}
      </p>
    </Link>
  )
}
