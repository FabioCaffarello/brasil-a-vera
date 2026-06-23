interface Props {
  votosSim: number
  votosNao: number
  aprovada: boolean
}

/**
 * MargemDecisaoBar — barra bilateral SIM ↔ NÃO mostrando a margem da
 * decisão visualmente. CSS-only (flex + width %), zero JS. Wave 9
 * Sprint 9.3 PR3.
 *
 * Estrutura: SIM (verde) à esquerda, NÃO (vermelho) à direita; widths
 * proporcionais ao total ativo (sim+nao). Abstenção/Ausente NÃO entram
 * — a barra é narrativa de tensão bilateral, não distribuição completa
 * (essa já vem no Donut consolidado, PR1).
 *
 * Estados:
 * - Votação simbólica (sim=0 e nao=0): mensagem honesta, sem barra
 * - Empate (sim=nao): barra 50/50, label "Empate"
 * - Aprovada: foco verde, label "+N votos a favor"
 * - Rejeitada: foco vermelho, label "+N votos contra"
 */
export function MargemDecisaoBar({ votosSim, votosNao, aprovada }: Props) {
  const total = votosSim + votosNao

  if (total === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Votação simbólica — sem voto nominal registrado.
      </p>
    )
  }

  const pctSim = (votosSim / total) * 100
  const pctNao = 100 - pctSim
  const margem = Math.abs(votosSim - votosNao)
  const empate = margem === 0

  const label = empate
    ? 'Empate'
    : aprovada
      ? `+${margem} votos a favor`
      : `+${margem} votos contra`

  const labelTone = empate
    ? 'text-fg-tertiary'
    : aprovada
      ? 'text-fg-success'
      : 'text-fg-error'

  return (
    <div className="space-y-1.5">
      <div
        aria-label={`Margem da decisão: ${label}`}
        className="flex h-2 w-full overflow-hidden rounded-full bg-surface-elevated"
        role="img"
      >
        <div
          className="bg-success transition-[width] duration-300 ease-out"
          style={{ width: `${pctSim}%` }}
        />
        <div
          className="bg-error transition-[width] duration-300 ease-out"
          style={{ width: `${pctNao}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs tabular-nums">
        <span className="font-medium text-fg-success">
          SIM {votosSim.toLocaleString('pt-BR')}
        </span>
        <span className={`font-medium ${labelTone}`}>{label}</span>
        <span className="font-medium text-fg-error">
          {votosNao.toLocaleString('pt-BR')} NÃO
        </span>
      </div>
    </div>
  )
}
