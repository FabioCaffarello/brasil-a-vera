import { describe, expect, it } from 'vitest'

import { decideMediana, MIN_AMOSTRA_MEDIANA } from './mediana-amostra'

// Esta regra é decisão arquitetural cravada (rodada 2 do plano Wave 8,
// §Decisões resolvidas #1 — Estrutura do KpiStrip + honestidade P2).
// Mudança aqui exige novo ADR ou revisão do plano. Por isso vale teste
// dedicado: protege o threshold contra regressão silenciosa.

describe('decideMediana', () => {
  it('retorna null quando amostra é zero', () => {
    expect(decideMediana(0, 0)).toBeNull()
  })

  it('retorna null para amostras entre 1 e MIN_AMOSTRA_MEDIANA - 1', () => {
    expect(decideMediana(1, 100)).toBeNull()
    expect(decideMediana(10, 200)).toBeNull()
    expect(decideMediana(MIN_AMOSTRA_MEDIANA - 1, 300)).toBeNull()
  })

  it('retorna objeto a partir de MIN_AMOSTRA_MEDIANA (inclusivo)', () => {
    expect(decideMediana(MIN_AMOSTRA_MEDIANA, 400)).toEqual({
      mediana: 400,
      amostra: MIN_AMOSTRA_MEDIANA,
    })
  })

  it('retorna objeto para amostras grandes', () => {
    expect(decideMediana(513, 287)).toEqual({ mediana: 287, amostra: 513 })
    expect(decideMediana(10_000, 1)).toEqual({ mediana: 1, amostra: 10_000 })
  })

  it('preserva o valor literal da mediana mesmo quando é zero ou negativo', () => {
    // Não filtramos por mediana — apenas por amostra. Mediana 0 é
    // legítima (proposição apresentada hoje). Mediana negativa não
    // deveria ocorrer (would mean future date), mas se ocorrer
    // queremos ver no log/UI, não engolir silenciosamente.
    expect(decideMediana(100, 0)).toEqual({ mediana: 0, amostra: 100 })
    expect(decideMediana(100, -1)).toEqual({ mediana: -1, amostra: 100 })
  })

  it('MIN_AMOSTRA_MEDIANA é 50 conforme rodada 2 do plano', () => {
    expect(MIN_AMOSTRA_MEDIANA).toBe(50)
  })
})
