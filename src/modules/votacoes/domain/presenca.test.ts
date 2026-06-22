import { describe, expect, it } from 'vitest'

import { calcularPresenca, PRESENCA_AMOSTRA_MINIMA } from './presenca'

describe('calcularPresenca', () => {
  it('calcula presença, ausências e percentual', () => {
    const r = calcularPresenca(18, 23)
    expect(r.presentes).toBe(18)
    expect(r.elegiveis).toBe(23)
    expect(r.ausencias).toBe(5)
    expect(r.percentual).toBe(78)
  })

  it('100% quando presente em todas', () => {
    expect(calcularPresenca(23, 23).percentual).toBe(100)
  })

  it('elegiveis = 0 → percentual null, amostra insuficiente', () => {
    const r = calcularPresenca(0, 0)
    expect(r.percentual).toBeNull()
    expect(r.amostraInsuficiente).toBe(true)
    expect(r.ausencias).toBe(0)
  })

  it('sinaliza amostra insuficiente abaixo do limiar', () => {
    expect(
      calcularPresenca(PRESENCA_AMOSTRA_MINIMA - 1, PRESENCA_AMOSTRA_MINIMA - 1)
        .amostraInsuficiente,
    ).toBe(true)
    expect(
      calcularPresenca(PRESENCA_AMOSTRA_MINIMA, PRESENCA_AMOSTRA_MINIMA)
        .amostraInsuficiente,
    ).toBe(false)
  })

  it('nunca produz ausências negativas', () => {
    // Defensivo: presentes não deveria exceder elegiveis, mas se ocorrer,
    // ausências fica em 0, não negativo.
    expect(calcularPresenca(25, 23).ausencias).toBe(0)
  })
})
