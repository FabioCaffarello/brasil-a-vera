import { DataBadge } from '@fabio.caffarello/react-design-system/server'

import type { VotacaoComissaoProposicaoItem } from '@/lib/queries/votacoes-comissao'

const RESULTADO_LABEL: Record<string, string> = {
  A: 'Aprovada',
  R: 'Rejeitada',
}

const RESULTADO_TONE: Record<
  string,
  'success' | 'error' | 'neutral' | 'warning' | 'dataviz'
> = {
  A: 'success',
  R: 'error',
}

interface Props {
  votacoes: VotacaoComissaoProposicaoItem[]
}

export function VotacoesComissaoSenado({ votacoes }: Props) {
  if (votacoes.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-fg-primary text-sm">
        Votações em comissão (Senado)
      </h4>
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
                </div>
                <p className="line-clamp-2 text-fg-primary text-sm">
                  {v.descricao}
                </p>
                <p className="text-fg-quaternary text-xs">
                  {v.votosSim} sim · {v.votosNao} não · {v.abstencoes} abstenção
                </p>
              </div>
              {v.resultado && (
                <DataBadge
                  label={RESULTADO_LABEL[v.resultado] ?? v.resultado}
                  tone={RESULTADO_TONE[v.resultado] ?? 'neutral'}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-fg-tertiary text-xs">
        Votações nominais em comissões do Senado. Cobertura limitada à janela de
        ingestão recente (30 dias por padrão).
      </p>
    </div>
  )
}
