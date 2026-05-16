import Link from 'next/link'

import { formatDataBR } from '@/lib/format'

interface Props {
  votacao: {
    id: string
    casa: string
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    votosSim: number
    votosNao: number
    abstencoes: number
  }
}

/**
 * Card de listagem de votação — Sprint 6.2 PR 3 (Wave 6, reskin
 * listagens).
 *
 * Mudanças vs Sprint 4.2 PR 2:
 * - Hover refinado: + hover:bg-surface-elevated (consistente com
 *   ParlamentarCard + ProposicaoCard pós-Sprint 6.2)
 * - Estrutura mantida — badges aprovada/rejeitada inline com tons
 *   semânticos (success/destructive subtle)
 *
 * Mesmo padrão de badge usado em card-votacoes-semana (home,
 * Sprint 4.1 PR 4).
 */
export function VotacaoCard({ votacao: v }: Props) {
  const totalNominais = v.votosSim + v.votosNao + v.abstencoes
  return (
    <Link
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href={`/votacoes/${v.id}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-foreground-muted text-xs">
        <span className="flex items-center gap-2">
          <span>{formatDataBR(v.dataHora)}</span>
          <span aria-hidden>·</span>
          <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
          <span aria-hidden>·</span>
          <span>{v.orgao}</span>
        </span>
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
      <p className="line-clamp-3 text-foreground text-sm">{v.descricao}</p>
      {totalNominais > 0 && (
        <p className="mt-2 tabular-nums text-foreground-muted text-xs">
          Sim: {v.votosSim} · Não: {v.votosNao} · Abstenção: {v.abstencoes}
        </p>
      )}
    </Link>
  )
}
