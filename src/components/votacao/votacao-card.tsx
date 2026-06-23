import { DataBadge } from '@fabio.caffarello/react-design-system/server'
import { VotacaoPreviewLink } from '@/components/votacao/preview-drawer'
import { resultadoStatus } from '@/components/votacao/resultado'
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
 * - Hover refinado: + hover:bg-surface-raised (consistente com
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
    <VotacaoPreviewLink
      className="block rounded-lg border border-line-default bg-surface-base p-4 transition-colors hover:border-line-emphasis hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
      data={{
        id: v.id,
        casa: v.casa,
        dataHora: v.dataHora,
        descricao: v.descricao,
        orgao: v.orgao,
        aprovada: v.aprovada,
        votosSim: v.votosSim,
        votosNao: v.votosNao,
        abstencoes: v.abstencoes,
      }}
      href={`/votacoes/${v.id}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-fg-tertiary text-xs">
        <span className="flex items-center gap-2">
          <span>{formatDataBR(v.dataHora)}</span>
          <span aria-hidden>·</span>
          <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
          <span aria-hidden>·</span>
          <span>{v.orgao}</span>
        </span>
        <DataBadge size="sm" {...resultadoStatus(v.aprovada)} />
      </div>
      <p className="line-clamp-3 text-fg-primary text-sm">{v.descricao}</p>
      {totalNominais > 0 && (
        <p className="mt-2 tabular-nums text-fg-tertiary text-xs">
          Sim: {v.votosSim} · Não: {v.votosNao} · Abstenção: {v.abstencoes}
        </p>
      )}
    </VotacaoPreviewLink>
  )
}
