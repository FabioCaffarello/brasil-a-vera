// Função pura de presença em votações nominais de plenário (Eixo 1, ADR-045).
// IO isolado: recebe contagens já apuradas pelo banco.

// Abaixo deste nº de votações de plenário elegíveis, o percentual é
// estatisticamente frágil — a UI sinaliza (a cobertura cresce com a ingestão).
export const PRESENCA_AMOSTRA_MINIMA = 10

export interface PresencaStats {
  /** Votações nominais de plenário da casa na janela de mandato. */
  elegiveis: number
  /** Elegíveis em que o parlamentar registrou voto ≠ AUSENTE. */
  presentes: number
  /** elegiveis − presentes. */
  ausencias: number
  /** % de presença (0–100, arredondado); null se elegiveis = 0. */
  percentual: number | null
  /** true se elegiveis < PRESENCA_AMOSTRA_MINIMA — UI sinaliza. */
  amostraInsuficiente: boolean
}

export function calcularPresenca(
  presentes: number,
  elegiveis: number,
): PresencaStats {
  return {
    elegiveis,
    presentes,
    ausencias: Math.max(0, elegiveis - presentes),
    percentual:
      elegiveis > 0 ? Math.round((presentes / elegiveis) * 100) : null,
    amostraInsuficiente: elegiveis < PRESENCA_AMOSTRA_MINIMA,
  }
}
