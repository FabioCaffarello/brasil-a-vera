import { formatProposicaoRef } from '@/lib/format'

interface Proposicao {
  proposicaoId: string
  tipo: string
  numero: number
  ano: number
  ementa: string
  situacao: string
  tipoAutoria: string
}

interface Props {
  proposicoes: Proposicao[]
}

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

export function ProposicoesAutor({ proposicoes }: Props) {
  if (proposicoes.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem proposições onde este parlamentar consta como autor ou coautor na
        base atual.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {proposicoes.map((p) => (
        <li
          key={p.proposicaoId}
          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
              {formatProposicaoRef(p.tipo, p.numero, p.ano)}
            </span>
            <span className="flex items-center gap-2">
              <span>{p.tipoAutoria === 'AUTOR' ? 'Autor' : 'Coautor'}</span>
              <span aria-hidden>·</span>
              <span>{SITUACAO_LABELS[p.situacao] ?? p.situacao}</span>
            </span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">
            {p.ementa}
          </p>
        </li>
      ))}
    </ul>
  )
}
