import { ALINHAMENTO_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/alinhamento'
import type { AlinhamentoCardState } from '@/modules/parlamentares/domain/alinhamento-card'

// Barra + texto de alinhamento à bancada. Componente apresentacional puro
// (server-safe): reusado pelo ParlamentarCard da listagem e pelo drawer de
// preview. Respeita o contrato de fallback de classifyAlinhamentoCard —
// só renderiza a barra no estado com_amostra (P2: honestidade do dado).
export function AlinhamentoStrip({ state }: { state: AlinhamentoCardState }) {
  if (state.kind === 'com_amostra') {
    return (
      <div>
        <div
          aria-hidden
          className="h-1.5 w-full overflow-hidden rounded-full bg-accent/15"
        >
          <div
            className="h-full rounded-full bg-accent/60"
            style={{ width: `${state.percentual}%` }}
          />
        </div>
        <p className="mt-1 text-fg-tertiary text-xs">
          <span className="font-medium text-fg-primary">
            {state.percentual}% alinhado
          </span>{' '}
          · {state.votacoes} {state.votacoes === 1 ? 'votação' : 'votações'}
        </p>
      </div>
    )
  }

  if (state.kind === 'amostra_insuficiente') {
    // "(mín. N)" explica por que 45 votações ainda é "insuficiente" — a
    // justaposição sem o limiar soava contraditória (auditoria UX 2026-07-20).
    return (
      <p className="text-fg-quaternary text-xs">
        Amostra insuficiente · {state.votacoes}{' '}
        {state.votacoes === 1 ? 'votação' : 'votações'} no período (mín.{' '}
        {ALINHAMENTO_AMOSTRA_MINIMA})
      </p>
    )
  }

  if (state.kind === 'federacao') {
    return (
      <p
        className="text-fg-quaternary text-xs"
        title="A Câmara publica a orientação pela federação, não pela sigla — sem dado comparável para este partido"
      >
        Alinhamento indisponível · partido em federação
      </p>
    )
  }

  // sem_dado
  return (
    <p
      className="text-fg-quaternary text-xs"
      title={
        state.senadoLegacy
          ? 'Senado: cobertura parcial de orientação partidária'
          : undefined
      }
    >
      Sem votações nominais registradas
    </p>
  )
}
