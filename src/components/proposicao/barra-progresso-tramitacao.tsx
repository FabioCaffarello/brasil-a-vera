import { MARCOS_TRAMITACAO } from '@/modules/proposicoes/domain/tramitacao-card'

export type BarraProgressoVariant = 'compact' | 'full'

interface Props {
  /** Posição corrente na barra de 5 marcos (1..5). Inferida por
   * `inferirMarcoAtual(ultimoOrgao, situacao)` no caller. */
  currentStep: 1 | 2 | 3 | 4 | 5
  /** Quando true, o último segmento ativo recebe `bg-destructive/60`
   * (sinal de fim negativo do ciclo — REJEITADA/ARQUIVADA). */
  terminalNegativo?: boolean
  /**
   * Visual presets:
   * - `compact`: 4px (h-1), sem labels visíveis. Usado em ProposicaoCard
   *   (listagem) onde espaço é escasso e o card já tem o orgao em texto.
   * - `full`: 8px (h-2) com labels horizontais abaixo de cada segmento.
   *   Usado no SectionCard "Tramitação" do detalhe — contexto visual
   *   narrativo de "onde está esta proposição no ciclo legislativo".
   */
  variant?: BarraProgressoVariant
  /** Label do contexto agregado — `aria-label` da barra (a11y). Caller
   * tipicamente passa "Tramitação em {ultimoOrgao}". */
  ariaLabel: string
}

/**
 * Barra de progresso de tramitação CSS-only (Wave 8 Sprint 8.1 PR4
 * compact + Sprint 8.3 PR4 full). Os 5 marcos canônicos vêm de
 * `src/modules/proposicoes/domain/tramitacao-card.ts:MARCOS_TRAMITACAO`.
 *
 * Cor das células ativas:
 * - Em curso ou terminal positivo: `bg-brand/60`
 * - Terminal negativo no segmento corrente: `bg-destructive/60`
 *
 * Inativas: `bg-surface-elevated`.
 *
 * Tokens-only: `--brand` (não `--accent` — P4 da Wave 8 reserva accent
 * para inflexão narrativa, não para status sequencial).
 *
 * A11y: role="img" + aria-label agregado + title por segmento (tooltip
 * nativo do nome do marco no hover).
 */
export function BarraProgressoTramitacao({
  currentStep,
  terminalNegativo = false,
  variant = 'compact',
  ariaLabel,
}: Props) {
  const isFull = variant === 'full'
  const barHeight = isFull ? 'h-2' : 'h-1'

  return (
    <div className={isFull ? 'space-y-2' : undefined}>
      <div
        aria-label={`${ariaLabel}, marco ${currentStep} de ${MARCOS_TRAMITACAO.length}`}
        className="flex gap-0.5"
        role="img"
      >
        {MARCOS_TRAMITACAO.map((marco, idx) => {
          const stepIndex = idx + 1
          const ativo = stepIndex <= currentStep
          const fillClass = !ativo
            ? 'bg-surface-elevated'
            : terminalNegativo && stepIndex === currentStep
              ? 'bg-destructive/60'
              : 'bg-brand/60'
          return (
            <div
              className={`${barHeight} flex-1 rounded-sm ${fillClass}`}
              key={marco}
              title={marco}
            />
          )
        })}
      </div>
      {isFull ? (
        // Labels horizontais abaixo de cada segmento. Em mobile (~375px)
        // são pequenos mas legíveis; em desktop ficam confortáveis. flex-1
        // alinha pixel-perfeito com os segmentos acima.
        <ul
          aria-hidden="true"
          className="flex gap-0.5 text-foreground-muted text-[10px] uppercase tracking-wide sm:text-xs"
        >
          {MARCOS_TRAMITACAO.map((marco, idx) => {
            const stepIndex = idx + 1
            const ativo = stepIndex <= currentStep
            const isCurrent = stepIndex === currentStep
            return (
              <li
                className={`flex-1 truncate text-center ${
                  isCurrent
                    ? terminalNegativo
                      ? 'font-medium text-destructive'
                      : 'font-medium text-brand'
                    : ativo
                      ? 'text-foreground-muted'
                      : 'text-foreground-subtle'
                }`}
                key={marco}
                title={marco}
              >
                {marco}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
