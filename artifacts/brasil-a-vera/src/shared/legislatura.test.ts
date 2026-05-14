import { describe, expect, it } from 'vitest'

import {
  DATA_INICIO_JANELA_QUENTE,
  LEGISLATURA_ANTERIOR,
  LEGISLATURA_ATUAL,
  LEGISLATURAS_QUENTES,
} from './legislatura'

describe('legislatura constants', () => {
  it('atual é exatamente uma legislatura à frente da anterior', () => {
    expect(LEGISLATURA_ATUAL).toBe(LEGISLATURA_ANTERIOR + 1)
  })

  it('LEGISLATURAS_QUENTES contém exatamente atual e anterior', () => {
    expect(LEGISLATURAS_QUENTES).toEqual([
      LEGISLATURA_ATUAL,
      LEGISLATURA_ANTERIOR,
    ])
  })

  it('DATA_INICIO_JANELA_QUENTE é anterior à data atual', () => {
    expect(DATA_INICIO_JANELA_QUENTE.getTime()).toBeLessThan(Date.now())
  })

  it('DATA_INICIO_JANELA_QUENTE corresponde ao começo da 56ª legislatura', () => {
    expect(DATA_INICIO_JANELA_QUENTE.toISOString()).toBe(
      '2019-02-01T00:00:00.000Z',
    )
  })
})
