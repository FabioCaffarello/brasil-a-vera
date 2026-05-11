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
  TRAMITANDO: 'Em tramitação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

export function ProposicaoVinculada({ proposicao: p }: Props) {
  return (
    <Link
      href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
      className="block rounded-lg border border-zinc-200 p-3 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
          {formatProposicaoRef(p.tipo, p.numero, p.ano)}
        </span>
        <span>{SITUACAO_LABELS[p.situacao] ?? p.situacao}</span>
      </div>
      <p className="line-clamp-2 text-sm text-zinc-800 dark:text-zinc-200">
        {p.ementa || <span className="italic text-zinc-500">(sem ementa)</span>}
      </p>
    </Link>
  )
}
