import { DataBadge } from '@fabio.caffarello/react-design-system/server'
import { Gavel } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import type { VotacaoComissaoItem } from '@/lib/queries/votacoes-comissao'

const VOTO_LABEL: Record<string, string> = {
  SIM: 'Sim',
  NAO: 'Não',
  ABSTENCAO: 'Abstenção',
  AUSENTE: 'Ausente',
  OBSTRUCAO: 'Obstrução',
}

const VOTO_TONE: Record<
  string,
  'success' | 'error' | 'neutral' | 'warning' | 'dataviz'
> = {
  SIM: 'success',
  NAO: 'error',
  ABSTENCAO: 'neutral',
  AUSENTE: 'warning',
  OBSTRUCAO: 'neutral',
}

interface Props {
  votacoes: VotacaoComissaoItem[]
}

export function VotacoesComissao({ votacoes }: Props) {
  if (votacoes.length === 0) {
    return (
      <EmptyState
        icon={Gavel}
        title="Nenhuma votação nominal em comissão encontrada nos últimos 30 dias."
      />
    )
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {votacoes.map((v) => (
          <li className="rounded-lg border border-line-default p-3" key={v.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg-secondary text-xs uppercase tracking-wide">
                    {v.comissaoSigla}
                  </span>
                  <span className="text-fg-quaternary text-xs">
                    {v.dataSessao}
                  </span>
                  {v.resultado && (
                    <span className="text-fg-tertiary text-xs">
                      — {v.resultado}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-fg-primary text-sm">
                  {v.descricao}
                </p>
                <p className="text-fg-quaternary text-xs">
                  Votos: {v.votosSim} sim · {v.votosNao} não · {v.abstencoes}{' '}
                  abstenção
                </p>
              </div>
              {v.voto && (
                <DataBadge
                  label={VOTO_LABEL[v.voto] ?? v.voto}
                  tone={VOTO_TONE[v.voto] ?? 'neutral'}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-fg-tertiary text-xs">
        Votações nominais em comissões do Senado nos últimos 30 dias (ingestão
        diária). Votações simbólicas sem registro nominal não aparecem.
      </p>
    </div>
  )
}
