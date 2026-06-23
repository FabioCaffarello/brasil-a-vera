import { BarraProgressoTramitacao } from '@/components/proposicao/barra-progresso-tramitacao'
import {
  type EstadoTramitacaoCard,
  inferirMarcoAtual,
  isSituacaoTerminalNegativa,
} from '@/modules/proposicoes/domain/tramitacao-card'

// Faixa de progresso de tramitação. Componente apresentacional puro
// (server-safe): reusado pelo ProposicaoCard da listagem e pelo drawer de
// preview. Renderização condicionada ao contrato de fallback (P2 —
// honestidade): com_marcos → barra + "Em {orgao}"; sem_marcos → "Apresentada
// há N dias"; sem_tramitacao → "Sem tramitação registrada".
export function TramitacaoStrip({
  estado,
  situacao,
}: {
  estado: EstadoTramitacaoCard
  situacao: string
}) {
  if (estado.kind === 'sem_tramitacao_registrada') {
    return (
      <p className="mt-3 text-fg-quaternary text-xs">
        Sem tramitação registrada
      </p>
    )
  }

  if (estado.kind === 'sem_marcos_relevantes') {
    return (
      <p className="mt-3 text-fg-quaternary text-xs">
        Apresentada há {estado.diasEmTramitacao}{' '}
        {estado.diasEmTramitacao === 1 ? 'dia' : 'dias'}
      </p>
    )
  }

  // com_marcos — render barra de 5 segmentos + label "Em {orgao}".
  const marcoAtual = inferirMarcoAtual(estado.ultimoOrgao, situacao)
  const terminalNegativo = isSituacaoTerminalNegativa(situacao)
  return (
    <div className="mt-3">
      <BarraProgressoTramitacao
        ariaLabel={`Tramitação em ${estado.ultimoOrgao}`}
        currentStep={marcoAtual}
        terminalNegativo={terminalNegativo}
        variant="compact"
      />
      <p
        className="mt-1.5 text-fg-tertiary text-xs"
        title={
          estado.obsoleto ? 'Sem movimentação há mais de 1 ano' : undefined
        }
      >
        Em{' '}
        <span className="font-medium text-fg-primary">
          {estado.ultimoOrgao}
        </span>
        {estado.obsoleto ? (
          <span className="ml-1 text-fg-warning">· parada há &gt;1 ano</span>
        ) : null}
      </p>
    </div>
  )
}
