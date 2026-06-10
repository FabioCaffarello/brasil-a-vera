// Cópia-rds de src/components/proposicao/barra-progresso-tramitacao.tsx
// (piloto-3). Server Component CSS-only. Traduções: brand→fg-brand
// (byte-idêntico pós-#358), destructive→error,
// surface-elevated→surface-raised. Lógica de marcos EXATA preservada
// (MARCOS_TRAMITACAO do módulo de domínio).

import { MARCOS_TRAMITACAO } from '@/modules/proposicoes/domain/tramitacao-card'

export type BarraProgressoVariant = 'compact' | 'full'

interface Props {
  /** Posição corrente na barra de 5 marcos (1..5). Inferida por
   * `inferirMarcoAtual(ultimoOrgao, situacao)` no caller. */
  currentStep: 1 | 2 | 3 | 4 | 5
  /** Quando true, o último segmento ativo recebe sinal de fim negativo
   * do ciclo (REJEITADA/ARQUIVADA). */
  terminalNegativo?: boolean
  /**
   * Visual presets:
   * - `compact`: 4px (h-1), sem labels visíveis.
   * - `full`: 8px (h-2) com labels horizontais abaixo de cada segmento.
   */
  variant?: BarraProgressoVariant
  /** Label do contexto agregado — `aria-label` da barra (a11y). */
  ariaLabel: string
}

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
            ? 'bg-surface-raised'
            : terminalNegativo && stepIndex === currentStep
              ? 'bg-error/60'
              : 'bg-fg-brand/60'
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
        // Labels horizontais abaixo de cada segmento; flex-1 alinha
        // pixel-perfeito com os segmentos acima.
        <ul
          aria-hidden="true"
          className="flex gap-0.5 text-[10px] text-fg-tertiary uppercase tracking-wide sm:text-xs"
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
                      ? 'font-medium text-fg-error'
                      : 'font-medium text-fg-brand'
                    : ativo
                      ? 'text-fg-tertiary'
                      : 'text-fg-quaternary'
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
